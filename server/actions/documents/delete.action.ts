"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type DeleteDocumentResult = { ok: true } | { ok: false; error: string };

export async function deleteDocumentAction(documentId: string): Promise<DeleteDocumentResult> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("documents")
    .select("project_id")
    .eq("id", documentId)
    .single();
  if (error || !data) return { ok: false, error: "Documento não encontrado." };

  const { error: delErr } = await supabase.from("documents").delete().eq("id", documentId);
  if (delErr) return { ok: false, error: delErr.message };

  revalidatePath(`/projetos/${data.project_id}/documentos`);
  return { ok: true };
}
