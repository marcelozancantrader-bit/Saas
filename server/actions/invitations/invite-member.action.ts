"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrg } from "@/server/services/current-org";
import { sendEmail } from "@/lib/email/resend";
import { env } from "@/lib/validators/env";
import { getPlanLimits, type PlanId } from "@/lib/plans/limits";

const schema = z.object({
  email: z.string().trim().toLowerCase().email("E-mail inválido").max(255),
  role: z.enum(["admin", "member"]),
});

export type InviteMemberResult =
  | { ok: true; invitation_id: string; token: string; email_sent: boolean }
  | { ok: false; error: string };

export async function inviteMemberAction(raw: z.infer<typeof schema>): Promise<InviteMemberResult> {
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const me = await getCurrentOrg();
  if (me.role !== "owner" && me.role !== "admin") {
    return { ok: false, error: "Só owner ou admin pode convidar membros." };
  }

  const supabase = await createClient();

  // ============================================================
  // BUG FIX P12: validar limite de usuários do plano antes de criar convite.
  // Antes, Free (maxUsers=1) podia convidar infinitos membros sem bloqueio.
  // ============================================================
  const { data: orgRow } = await supabase
    .from("organizations")
    .select("plano")
    .eq("id", me.orgId)
    .single<{ plano: PlanId }>();
  const planLimits = getPlanLimits(orgRow?.plano ?? "free");

  if (planLimits.maxUsers !== null) {
    // Conta membros atuais + convites pendentes (que ainda podem virar membros).
    // Convite pendente conta porque, se virar member, vai estourar o limite.
    const [{ count: memberCount }, { count: pendingInvitesCount }] = await Promise.all([
      supabase
        .from("organization_members")
        .select("user_id", { count: "exact", head: true })
        .eq("org_id", me.orgId),
      supabase
        .from("invitations")
        .select("id", { count: "exact", head: true })
        .eq("org_id", me.orgId)
        .eq("status", "pending"),
    ]);

    const totalPotencial = (memberCount ?? 0) + (pendingInvitesCount ?? 0);
    if (totalPotencial >= planLimits.maxUsers) {
      return {
        ok: false,
        error: `Limite do plano atingido: ${planLimits.maxUsers} ${planLimits.maxUsers === 1 ? "usuário" : "usuários"} (incluindo convites pendentes). Faça upgrade para convidar mais.`,
      };
    }
  }

  // Cancela convites pendentes antigos pra esse e-mail (deduplica).
  // Se a pessoa já é membro, a acceptInvitationAction detecta e marca o convite
  // como aceito sem criar membership duplicado — sem precisar checar aqui.
  await supabase
    .from("invitations")
    .update({ status: "cancelled" })
    .eq("org_id", me.orgId)
    .eq("email", parsed.data.email)
    .eq("status", "pending");

  const { data: inserted, error: insErr } = await supabase
    .from("invitations")
    .insert({
      org_id: me.orgId,
      email: parsed.data.email,
      role: parsed.data.role,
      invited_by: me.userId,
    })
    .select("id, token")
    .single<{ id: string; token: string }>();
  if (insErr || !inserted) {
    return { ok: false, error: insErr?.message ?? "Falha ao criar convite." };
  }

  const inviteUrl = `${env.NEXT_PUBLIC_APP_URL}/convite/${inserted.token}`;
  const subject = `Convite pra entrar no workspace ${me.orgName} no Memorial.ai`;

  const text = [
    `Você foi convidado(a) para entrar no workspace "${me.orgName}" no Memorial.ai.`,
    "",
    `Função: ${parsed.data.role === "admin" ? "Admin (gerencia membros e configurações)" : "Membro (acesso aos projetos)"}`,
    "",
    "Pra aceitar, abra o link abaixo. Se ainda não tem conta, vai pedir pra criar agora (de graça):",
    inviteUrl,
    "",
    "O convite expira em 7 dias.",
    "",
    "Se você não esperava esse convite, pode ignorar este e-mail.",
  ].join("\n");

  const html = `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#18181b;">
      <h2 style="font-size:18px;margin:0 0 12px;">
        Convite pra entrar em <strong>${escapeHtml(me.orgName)}</strong>
      </h2>
      <p style="font-size:14px;line-height:1.6;color:#3f3f46;">
        Você foi convidado(a) pra entrar no workspace no Memorial.ai como
        <strong>${parsed.data.role === "admin" ? "Admin" : "Membro"}</strong>.
      </p>
      <div style="margin:20px 0;">
        <a href="${inviteUrl}"
           style="display:inline-block;background:#1d4ed8;color:white;padding:10px 18px;border-radius:6px;text-decoration:none;font-weight:600;font-size:14px;">
          Aceitar convite
        </a>
      </div>
      <p style="font-size:12px;color:#71717a;line-height:1.5;">
        Ou copie e cole no navegador:<br/>
        <code style="font-size:11px;word-break:break-all;">${inviteUrl}</code>
      </p>
      <p style="font-size:12px;color:#71717a;margin-top:24px;border-top:1px solid #e4e4e7;padding-top:12px;">
        Convite expira em 7 dias. Se você não esperava esse convite, ignore.
      </p>
    </div>
  `;

  const emailResult = await sendEmail({
    to: parsed.data.email,
    subject,
    text,
    html,
    tag: "invitation.created",
  });

  revalidatePath("/configuracoes/membros");
  return {
    ok: true,
    invitation_id: inserted.id,
    token: inserted.token,
    email_sent: emailResult.ok,
  };
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => {
    switch (c) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      default:
        return "&#39;";
    }
  });
}
