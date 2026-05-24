"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { createHash } from "node:crypto";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { assertPortalAccess } from "@/server/services/portal-loader";
import { notify } from "@/server/services/notifications";
import { captureServer } from "@/lib/observability/posthog";

const schema = z.object({
  token: z.string().uuid(),
  project_id: z.string().uuid(),
  document_id: z.string().uuid(),
  decisao: z.enum(["aprovado", "recusado"]),
  assinatura_data_url: z.string().regex(/^data:image\/(png|jpeg);base64,/),
  observacoes: z.string().max(2000).optional(),
});

export type ApproveDocumentInput = z.infer<typeof schema>;
export type ApproveDocumentResult = { ok: true } | { ok: false; error: string };

function ipFromHeaders(h: Headers): string | null {
  const xff = h.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();
  return h.get("x-real-ip");
}

export async function approveDocumentAction(
  raw: ApproveDocumentInput,
): Promise<ApproveDocumentResult> {
  const parsed = schema.safeParse(raw);
  if (!parsed.success)
    return { ok: false, error: "Dados inválidos: " + parsed.error.issues[0]!.message };

  const access = await assertPortalAccess(parsed.data.token, parsed.data.project_id);
  if (!access.ok) return { ok: false, error: "Acesso negado ao portal." };

  const admin = createAdminClient();

  // Carrega o doc para hash do conteúdo + validação de elegibilidade
  const { data: doc, error: docErr } = await admin
    .from("documents")
    .select("id, project_id, conteudo_tiptap, envio_meta, aprovacao_meta, hash_sha256")
    .eq("id", parsed.data.document_id)
    .eq("project_id", parsed.data.project_id)
    .maybeSingle();
  if (docErr) return { ok: false, error: docErr.message };
  if (!doc) return { ok: false, error: "Documento não encontrado." };
  if (!doc.envio_meta) return { ok: false, error: "Documento ainda não foi enviado para você." };
  if (doc.aprovacao_meta) return { ok: false, error: "Este documento já foi respondido por você." };

  const conteudoHash =
    doc.hash_sha256 ??
    createHash("sha256").update(JSON.stringify(doc.conteudo_tiptap)).digest("hex");

  const h = await headers();
  const aprovacao_meta = {
    decisao: parsed.data.decisao,
    assinatura_data_url: parsed.data.assinatura_data_url,
    ip: ipFromHeaders(h),
    user_agent: h.get("user-agent"),
    timestamp: new Date().toISOString(),
    hash_documento: conteudoHash,
    observacoes: parsed.data.observacoes ?? "",
  };

  const { error: updateErr } = await admin
    .from("documents")
    .update({
      aprovacao_meta,
      aprovado_em: parsed.data.decisao === "aprovado" ? new Date().toISOString() : null,
      status: parsed.data.decisao === "aprovado" ? "aprovado" : "recusado",
      hash_sha256: conteudoHash,
    })
    .eq("id", parsed.data.document_id);
  if (updateErr) return { ok: false, error: updateErr.message };

  // Audit log
  await admin.from("audit_log").insert({
    org_id: access.orgId,
    actor_id: null,
    actor_type: "client_portal",
    action: parsed.data.decisao === "aprovado" ? "document.approved" : "document.rejected",
    entity_type: "document",
    entity_id: parsed.data.document_id,
    payload: { hash: conteudoHash, observacoes: parsed.data.observacoes ?? "" },
    ip: aprovacao_meta.ip,
    user_agent: aprovacao_meta.user_agent,
  });

  // In-app notification para o escritório.
  await notify({
    org_id: access.orgId,
    type: parsed.data.decisao === "aprovado" ? "document.approved" : "document.rejected",
    title:
      parsed.data.decisao === "aprovado"
        ? "Cliente aprovou um documento"
        : "Cliente recusou um documento",
    body: parsed.data.observacoes ?? undefined,
    link_url: `/projetos/${parsed.data.project_id}/documentos/${parsed.data.document_id}`,
    meta: { document_id: parsed.data.document_id, hash: conteudoHash },
  });

  revalidatePath(`/portal/${parsed.data.token}`);
  revalidatePath(`/projetos/${parsed.data.project_id}/documentos`);
  revalidatePath(`/projetos/${parsed.data.project_id}/documentos/${parsed.data.document_id}`);

  // Analytics — cliente final NÃO tem user.id, então usamos o portal token
  // como distinct_id pra atribuir o evento (anônimo do nosso lado).
  // Mantém referência da org pra group analytics.
  void captureServer({
    event: "portal.document_decided",
    distinctId: `portal:${parsed.data.token}`,
    orgId: access.orgId,
    properties: {
      project_id: parsed.data.project_id,
      document_id: parsed.data.document_id,
      decisao: parsed.data.decisao,
    },
  });

  return { ok: true };
}
