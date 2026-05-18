"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

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

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("project_files")
    .insert(parsed.data)
    .select("id")
    .single();

  if (error || !data) {
    return { ok: false, error: error?.message ?? "Falha ao registrar arquivo." };
  }

  revalidatePath(`/projetos/${parsed.data.project_id}`);
  return { ok: true, id: data.id };
}
