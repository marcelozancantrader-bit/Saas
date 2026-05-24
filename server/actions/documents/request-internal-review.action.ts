"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrg } from "@/server/services/current-org";

const schema = z.object({
  document_id: z.string().uuid(),
  comentario: z.string().trim().max(500).optional().or(z.literal("")),
});

export type RequestInternalReviewResult = { ok: true } | { ok: false; error: string };

/**
 * Member (ou owner/admin) solicita revisão interna do documento antes
 * de enviar ao cliente. Status vai pra "aguardando_revisao_interna".
 *
 * Owner/admin verá o doc na lista com badge "aguardando revisão" e
 * poderá aprovar (libera pra enviar ao portal) ou pedir ajustes.
 */
export async function requestInternalReviewAction(
  raw: z.infer<typeof schema>,
): Promise<RequestInternalReviewResult> {
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Dados inválidos." };

  const me = await getCurrentOrg();
  const supabase = await createClient();

  // Lê doc pra validar status atual (deve estar em rascunho)
  const { data: doc, error: readErr } = await supabase
    .from("documents")
    .select("id, project_id, status, revisao_interna_meta")
    .eq("id", parsed.data.document_id)
    .single<{
      id: string;
      project_id: string;
      status: string;
      revisao_interna_meta: Record<string, unknown> | null;
    }>();
  if (readErr || !doc) return { ok: false, error: "Documento não encontrado." };

  if (doc.status !== "rascunho") {
    return {
      ok: false,
      error: "Só dá pra solicitar revisão de documento em rascunho. Status atual: " + doc.status,
    };
  }

  const prevMeta = (doc.revisao_interna_meta ?? {}) as Record<string, unknown>;
  const novaMeta = {
    ...prevMeta,
    solicitada_por: me.userId,
    solicitada_em: new Date().toISOString(),
    comentario_solicitacao: parsed.data.comentario || null,
    // Limpa decisão anterior se houve
    decidida_por: null,
    decidida_em: null,
    decisao: null,
    comentario_revisao: null,
  };

  const { error: updErr } = await supabase
    .from("documents")
    .update({
      status: "aguardando_revisao_interna",
      revisao_interna_meta: novaMeta,
    })
    .eq("id", parsed.data.document_id);
  if (updErr) return { ok: false, error: updErr.message };

  revalidatePath(`/projetos/${doc.project_id}/documentos`);
  revalidatePath(`/projetos/${doc.project_id}/documentos/${parsed.data.document_id}`);
  return { ok: true };
}
