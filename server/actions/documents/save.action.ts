"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const saveSchema = z.object({
  document_id: z.string().uuid(),
  titulo: z.string().min(1).max(500).optional(),
  conteudo_tiptap: z.record(z.string(), z.unknown()),
});

export type SaveDocumentInput = z.infer<typeof saveSchema>;

export type SaveDocumentResult = { ok: true } | { ok: false; error: string };

export async function saveDocumentAction(raw: SaveDocumentInput): Promise<SaveDocumentResult> {
  const parsed = saveSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Dados inválidos." };

  const supabase = await createClient();
  const update: Record<string, unknown> = {
    conteudo_tiptap: parsed.data.conteudo_tiptap,
  };
  if (parsed.data.titulo !== undefined) update.titulo = parsed.data.titulo;

  const { data, error } = await supabase
    .from("documents")
    .update(update)
    .eq("id", parsed.data.document_id)
    .select("project_id")
    .single();

  if (error || !data) {
    return { ok: false, error: error?.message ?? "Falha ao salvar." };
  }

  revalidatePath(`/projetos/${data.project_id}/documentos`);
  revalidatePath(`/projetos/${data.project_id}/documentos/${parsed.data.document_id}`);
  return { ok: true };
}
