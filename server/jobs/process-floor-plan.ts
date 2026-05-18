import "server-only";
import { inngest, type ProjectFileUploadedData } from "@/lib/inngest/client";
import { createAdminClient } from "@/lib/supabase/admin";
import { extractFloorPlanData } from "@/lib/ai/extract-floor-plan";

/**
 * Inngest function: extract structured data from an uploaded planta PDF.
 *
 * Triggered by event "project_file.uploaded" emitted by registerUploadAction
 * when tipo='planta_pdf'. Steps:
 *   1. Mark project_files.extracao_status='processando'
 *   2. Download PDF from Supabase Storage
 *   3. Call extractFloorPlanData (Claude Sonnet 4.6 + tool_use)
 *   4. Save result to project_files.extracao_resultado + projects.meta
 *   5. Mark extracao_status='concluida' (or 'erro' with extracao_erro)
 *
 * Retries: Inngest retries with backoff on thrown errors (default 4 attempts).
 */
export const processFloorPlan = inngest.createFunction(
  {
    id: "process-floor-plan",
    name: "Extrair dados de planta PDF",
    retries: 3,
    concurrency: { limit: 5 },
    triggers: [{ event: "project_file.uploaded" }],
  },
  async ({ event, step, logger }) => {
    const { project_file_id, project_id, org_id, storage_path, tipo } =
      event.data as ProjectFileUploadedData;

    if (tipo !== "planta_pdf") {
      logger.info(`Skipping ${project_file_id} — tipo=${tipo}`);
      return { skipped: true, reason: "wrong_tipo" };
    }

    const admin = createAdminClient();

    // Step 1: mark as processing
    await step.run("mark-processing", async () => {
      const { error } = await admin
        .from("project_files")
        .update({ extracao_status: "processando", extracao_erro: null })
        .eq("id", project_file_id);
      if (error) throw new Error(`Failed to mark processing: ${error.message}`);
    });

    // Step 2: download PDF bytes via service-role storage access.
    // Return Base64 because Inngest serializes step outputs as JSON.
    const pdfBase64 = await step.run("download-pdf", async () => {
      const { data, error } = await admin.storage.from("project-files").download(storage_path);
      if (error || !data) {
        throw new Error(`Storage download failed: ${error?.message ?? "no data"}`);
      }
      const buf = Buffer.from(await data.arrayBuffer());
      return buf.toString("base64");
    });

    // Step 3: call Anthropic (timeout 60s; Inngest retries on thrown)
    const result = await step.run("call-anthropic", async () => {
      return await extractFloorPlanData(
        {
          pdfBytes: Buffer.from(pdfBase64, "base64"),
          filename: storage_path.split("/").pop() ?? "planta.pdf",
        },
        { timeoutMs: 60_000 },
      );
    });

    // Step 4: persist
    if (!result.ok) {
      await step.run("mark-error", async () => {
        await admin
          .from("project_files")
          .update({
            extracao_status: "erro",
            extracao_erro: `${result.error}${result.detail ? ` (${result.detail})` : ""}`,
          })
          .eq("id", project_file_id);
      });
      logger.error(`Extraction failed for ${project_file_id}: ${result.error}`);
      return { ok: false, error: result.error };
    }

    await step.run("save-result", async () => {
      const resultado = {
        ...result.data,
        _meta: {
          prompt_version: result.promptVersion,
          model: result.model,
          usage: result.usage,
          extracted_at: new Date().toISOString(),
          source_org_id: org_id,
        },
      };

      const { error: fileErr } = await admin
        .from("project_files")
        .update({
          extracao_status: "concluida",
          extracao_resultado: resultado,
          extracao_erro: null,
        })
        .eq("id", project_file_id);
      if (fileErr) throw new Error(`Save project_files failed: ${fileErr.message}`);

      const { data: project, error: projReadErr } = await admin
        .from("projects")
        .select("meta")
        .eq("id", project_id)
        .single();
      if (projReadErr) throw new Error(`Read project meta failed: ${projReadErr.message}`);

      const currentMeta = (project?.meta ?? {}) as Record<string, unknown>;
      const newMeta = {
        ...currentMeta,
        extracao_planta: {
          source_file_id: project_file_id,
          area_total_m2: result.data.area_total_m2,
          tipologia: result.data.tipologia,
          padrao_construtivo: result.data.padrao_construtivo,
          numero_pavimentos: result.data.numero_pavimentos,
          confianca: result.data.confianca,
          extracted_at: new Date().toISOString(),
          confirmed_by_user: false,
        },
      };

      const { error: projWriteErr } = await admin
        .from("projects")
        .update({ meta: newMeta })
        .eq("id", project_id);
      if (projWriteErr) throw new Error(`Save project meta failed: ${projWriteErr.message}`);
    });

    logger.info(
      `Extraction OK for ${project_file_id}: ${result.data.ambientes.length} ambientes, ${result.usage.usd_cost.toFixed(4)} USD`,
    );
    return { ok: true, ambientes: result.data.ambientes.length, usd: result.usage.usd_cost };
  },
);
