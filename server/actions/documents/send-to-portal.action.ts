"use server";

import { revalidatePath } from "next/cache";
import { createHash } from "node:crypto";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email/resend";
import { env } from "@/lib/validators/env";
import { getPlanLimits, type PlanId } from "@/lib/plans/limits";

const schema = z.object({
  document_id: z.string().uuid(),
});

export type SendToPortalInput = z.infer<typeof schema>;
export type SendToPortalResult =
  | { ok: true; portal_token: string; email_sent: boolean }
  | { ok: false; error: string };

export async function sendDocumentToPortalAction(
  raw: SendToPortalInput,
): Promise<SendToPortalResult> {
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Dados inválidos." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sessão expirada." };

  // Carrega o doc (RLS garante que o usuário tem acesso) + portal_token, email
  // do client, e nome da organização (para o assunto do e-mail).
  const { data: doc, error: docErr } = await supabase
    .from("documents")
    .select(
      `id, titulo, project_id, conteudo_tiptap,
       projects!inner(
         nome, client_id, org_id,
         clients!inner(portal_token, email, nome),
         organizations!inner(name)
       )`,
    )
    .eq("id", parsed.data.document_id)
    .single();
  if (docErr || !doc) return { ok: false, error: docErr?.message ?? "Documento não encontrado." };

  const project = doc.projects as unknown as {
    nome: string;
    client_id: string | null;
    org_id: string;
    clients: { portal_token: string; email: string | null; nome: string } | null;
    organizations: { name: string } | null;
  };
  if (!project.client_id || !project.clients)
    return {
      ok: false,
      error: "Projeto não tem cliente associado — vincule um cliente antes de enviar ao portal.",
    };

  // Plan gating: Free não tem portal.
  const { data: orgRow } = await supabase
    .from("organizations")
    .select("plano")
    .eq("id", project.org_id)
    .single<{ plano: PlanId }>();
  if (!getPlanLimits(orgRow?.plano ?? "free").portalClienteEnabled) {
    return {
      ok: false,
      error:
        "Portal do cliente está disponível a partir do plano Pro. Faça upgrade em /billing para liberar.",
    };
  }

  const hash = createHash("sha256").update(JSON.stringify(doc.conteudo_tiptap)).digest("hex");
  const envio_meta = {
    enviado_em: new Date().toISOString(),
    enviado_por: user.id,
  };

  const { error: upErr } = await supabase
    .from("documents")
    .update({
      envio_meta,
      hash_sha256: hash,
      status: "aguardando_aprovacao",
    })
    .eq("id", parsed.data.document_id);
  if (upErr) return { ok: false, error: upErr.message };

  // E-mail para o cliente. Silenciosamente pulado se RESEND_API_KEY ausente.
  let emailSent = false;
  if (project.clients.email) {
    const portalUrl = `${env.NEXT_PUBLIC_APP_URL}/portal/${project.clients.portal_token}`;
    const orgName = project.organizations?.name ?? "Memorial.ai";
    const r = await sendEmail({
      to: project.clients.email,
      subject: `${orgName}: novo documento para sua aprovação — ${doc.titulo}`,
      html: `
        <p>Olá ${project.clients.nome},</p>
        <p>Você recebeu um novo documento para revisar e aprovar no projeto
        <strong>${project.nome}</strong>: <em>${doc.titulo}</em>.</p>
        <p><a href="${portalUrl}" style="display:inline-block;background:#111;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none">Abrir portal do projeto</a></p>
        <p style="color:#666;font-size:12px">Ou copie e cole este link: ${portalUrl}</p>
        <p style="color:#666;font-size:12px">${orgName} via Memorial.ai</p>
      `,
      text: `Olá ${project.clients.nome},\n\nNovo documento para sua aprovação: ${doc.titulo}\nProjeto: ${project.nome}\n\nAbra o portal: ${portalUrl}\n\n${orgName} via Memorial.ai`,
      tag: "portal.document_sent",
    });
    emailSent = r.ok;
  }

  revalidatePath(`/projetos/${doc.project_id}/documentos`);
  revalidatePath(`/projetos/${doc.project_id}/documentos/${parsed.data.document_id}`);
  return { ok: true, portal_token: project.clients.portal_token, email_sent: emailSent };
}
