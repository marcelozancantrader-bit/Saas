"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({
  document_id: z.string().uuid(),
  status: z.enum(["rascunho", "aguardando_aprovacao", "aprovado", "arquivado"]),
});

export type FinalizeDocumentInput = z.infer<typeof schema>;

export type FinalizeDocumentResult = { ok: true } | { ok: false; error: string };

export async function finalizeDocumentAction(
  raw: FinalizeDocumentInput,
): Promise<FinalizeDocumentResult> {
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Status inválido." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("documents")
    .update({ status: parsed.data.status })
    .eq("id", parsed.data.document_id)
    .select("project_id")
    .single();
  if (error || !data) return { ok: false, error: error?.message ?? "Falha." };

  revalidatePath(`/projetos/${data.project_id}/documentos`);
  revalidatePath(`/projetos/${data.project_id}/documentos/${parsed.data.document_id}`);
  return { ok: true };
}
