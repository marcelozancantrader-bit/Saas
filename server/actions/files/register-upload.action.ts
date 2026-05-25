"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrg } from "@/server/services/current-org";
import { inngest } from "@/lib/inngest/client";
import { DISCIPLINAS } from "@/lib/ai/prompts/_shared-extraction-schema";
import { checkStorageQuota } from "@/server/services/storage-quota";
import { getPlanLimits, formatBytes, type PlanId } from "@/lib/plans/limits";
import { denyForUpgrade, type ActionFailure } from "@/lib/billing/upgrade-gate";

const registerSchema = z.object({
  project_id: z.string().uuid(),
  storage_path: z.string().min(1),
  nome_original: z.string().min(1),
  mime_type: z.string().min(1),
  tamanho_bytes: z.number().int().positive(),
  hash_sha256: z.string().optional(),
  tipo: z.enum(["planta_pdf", "dwg", "imagem", "doc_gerado", "outro"]).default("outro"),
  disciplina: z.enum(DISCIPLINAS).default("architectural"),
});

export type RegisterUploadInput = z.infer<typeof registerSchema>;

export type RegisterUploadResult = { ok: true; id: string } | ActionFailure;

export async function registerUploadAction(
  raw: RegisterUploadInput,
): Promise<RegisterUploadResult> {
  const parsed = registerSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: "Dados de upload inválidos." };
  }

  // Plan gate: storage quota. Antes deste check, Free podia subir TB de arquivos
  // (limite só existia em PlanLimits.storageBytes mas não era enforçado).
  const me = await getCurrentOrg();
  const supabase = await createClient();
  const { data: orgRow } = await supabase
    .from("organizations")
    .select("plano")
    .eq("id", me.orgId)
    .single<{ plano: PlanId }>();
  const currentPlan = orgRow?.plano ?? "free";
  const limits = getPlanLimits(currentPlan);
  const quotaCheck = await checkStorageQuota(
    me.orgId,
    parsed.data.tamanho_bytes,
    limits.storageBytes,
  );
  if (!quotaCheck.ok) {
    return denyForUpgrade({
      feature: "storageBytes",
      currentPlan,
      requires: (l) =>
        l.storageBytes === null || l.storageBytes > quotaCheck.usedBytes + quotaCheck.bytesToAdd,
      message: `Limite de armazenamento atingido: ${formatBytes(
        quotaCheck.usedBytes,
      )} de ${formatBytes(quotaCheck.limitBytes)}. Esse arquivo (${formatBytes(
        quotaCheck.bytesToAdd,
      )}) não cabe — apague algum existente ou faça upgrade.`,
      limit: {
        used: Math.round(quotaCheck.usedBytes / (1024 * 1024)),
        limit: Math.round(quotaCheck.limitBytes / (1024 * 1024)),
        unit: "MB",
      },
    });
  }

  // Initial status: only PDFs go through AI extraction.
  const initialStatus = parsed.data.tipo === "planta_pdf" ? "pendente" : null;

  const { data, error } = await supabase
    .from("project_files")
    .insert({ ...parsed.data, extracao_status: initialStatus })
    .select("id")
    .single();

  if (error || !data) {
    return { ok: false, error: error?.message ?? "Falha ao registrar arquivo." };
  }

  // Fire Inngest event for async extraction. Swallow errors — file is registered either way.
  if (parsed.data.tipo === "planta_pdf") {
    try {
      await inngest.send({
        name: "project_file.uploaded",
        data: {
          project_file_id: data.id,
          project_id: parsed.data.project_id,
          org_id: me.orgId,
          storage_path: parsed.data.storage_path,
          mime_type: parsed.data.mime_type,
          tipo: parsed.data.tipo,
          disciplina: parsed.data.disciplina,
        },
      });
    } catch (err) {
      console.warn(
        `[register-upload] Inngest event failed (file registered anyway): ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  revalidatePath(`/projetos/${parsed.data.project_id}`);
  return { ok: true, id: data.id };
}
