"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrg } from "@/server/services/current-org";

const schema = z.object({
  document_id: z.string().uuid(),
  decisao: z.enum(["aprovada", "recusada"]),
  comentario: z.string().trim().max(500).optional().or(z.literal("")),
});

export type DecideInternalReviewResult = { ok: true } | { ok: false; error: string };

/**
 * Owner/admin aprova ou recusa a revisão interna. Em qualquer caso,
 * doc volta pra "rascunho" — se aprovada, libera enviar ao portal;
 * se recusada, member ajusta e pode pedir nova revisão.
 *
 * Aprovação interna NÃO é a aprovação do cliente — essa continua sendo
 * via assinatura no portal /portal/<token>.
 */
export async function decideInternalReviewAction(
  raw: z.infer<typeof schema>,
): Promise<DecideInternalReviewResult> {
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Dados inválidos." };

  const me = await getCurrentOrg();
  if (me.role !== "owner" && me.role !== "admin") {
    return {
      ok: false,
      error: "Só owner ou admin pode decidir revisão interna.",
    };
  }

  if (
    parsed.data.decisao === "recusada" &&
    (!parsed.data.comentario || parsed.data.comentario.trim().length < 3)
  ) {
    return {
      ok: false,
      error: "Recusa exige comentário explicando o que precisa ajustar (mínimo 3 caracteres).",
    };
  }

  const supabase = await createClient();
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

  if (doc.status !== "aguardando_revisao_interna") {
    return {
      ok: false,
      error: "Documento não está aguardando revisão interna no momento.",
    };
  }

  const prevMeta = (doc.revisao_interna_meta ?? {}) as Record<string, unknown>;
  const novaMeta = {
    ...prevMeta,
    decidida_por: me.userId,
    decidida_em: new Date().toISOString(),
    decisao: parsed.data.decisao,
    comentario_revisao: parsed.data.comentario || null,
  };

  // Em qualquer decisão, doc volta pra rascunho. A diferença é a
  // anotação na meta — UI pode mostrar "Revisão aprovada por X em Y".
  const { error: updErr } = await supabase
    .from("documents")
    .update({
      status: "rascunho",
      revisao_interna_meta: novaMeta,
    })
    .eq("id", parsed.data.document_id);
  if (updErr) return { ok: false, error: updErr.message };

  revalidatePath(`/projetos/${doc.project_id}/documentos`);
  revalidatePath(`/projetos/${doc.project_id}/documentos/${parsed.data.document_id}`);
  return { ok: true };
}
