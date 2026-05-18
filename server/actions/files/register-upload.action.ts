"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrg } from "@/server/services/current-org";
import { inngest } from "@/lib/inngest/client";
import { DISCIPLINAS } from "@/lib/ai/prompts/_shared-extraction-schema";

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

export type RegisterUploadResult = { ok: true; id: string } | { ok: false; error: string };

export async function registerUploadAction(
  raw: RegisterUploadInput,
): Promise<RegisterUploadResult> {
  const parsed = registerSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: "Dados de upload inválidos." };
  }

  // Initial status: only PDFs go through AI extraction.
  const initialStatus = parsed.data.tipo === "planta_pdf" ? "pendente" : null;

  const supabase = await createClient();
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
      const org = await getCurrentOrg();
      await inngest.send({
        name: "project_file.uploaded",
        data: {
          project_file_id: data.id,
          project_id: parsed.data.project_id,
          org_id: org.orgId,
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
