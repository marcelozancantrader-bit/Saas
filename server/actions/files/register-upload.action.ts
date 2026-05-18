"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrg } from "@/server/services/current-org";
import { inngest } from "@/lib/inngest/client";

const registerSchema = z.object({
  project_id: z.string().uuid(),
  storage_path: z.string().min(1),
  nome_original: z.string().min(1),
  mime_type: z.string().min(1),
  tamanho_bytes: z.number().int().positive(),
  hash_sha256: z.string().optional(),
  tipo: z.enum(["planta_pdf", "dwg", "imagem", "doc_gerado", "outro"]).default("outro"),
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

  // Set initial extracao_status so the UI can show a "queued" state immediately
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

  // If this is a planta PDF, fire the Inngest event for async extraction.
  // We swallow Inngest errors — the file is registered either way; missing
  // INNGEST_EVENT_KEY in local dev (no Inngest dev server) shouldn't break the upload.
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
