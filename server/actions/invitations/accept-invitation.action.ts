"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const schema = z.object({
  token: z.string().uuid(),
});

export type AcceptInvitationResult =
  | { ok: true; org_id: string }
  | { ok: false; error: string; needs_login?: boolean; expected_email?: string };

/**
 * Aceita convite via token UUID. Usuário precisa estar logado.
 * - Se o e-mail do user logado não bate com o do convite, retorna erro
 *   (evita aceitar convite alheio acidentalmente).
 * - Cria linha em organization_members com a role do convite.
 * - Marca invitation como accepted.
 */
export async function acceptInvitationAction(
  raw: z.infer<typeof schema>,
): Promise<AcceptInvitationResult> {
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Token inválido." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Faça login pra aceitar o convite.", needs_login: true };

  // Lê o convite via service-role (já que policies anon validam status=pending)
  const admin = createAdminClient();
  const { data: invite, error: readErr } = await admin
    .from("invitations")
    .select("id, org_id, email, role, status, expires_at, accepted_at")
    .eq("token", parsed.data.token)
    .single<{
      id: string;
      org_id: string;
      email: string;
      role: "admin" | "member";
      status: string;
      expires_at: string;
      accepted_at: string | null;
    }>();

  if (readErr || !invite) return { ok: false, error: "Convite não encontrado." };
  if (invite.status === "cancelled") return { ok: false, error: "Convite foi cancelado." };
  if (invite.status === "accepted") return { ok: false, error: "Convite já foi aceito." };
  if (new Date(invite.expires_at) < new Date()) {
    await admin.from("invitations").update({ status: "expired" }).eq("id", invite.id);
    return { ok: false, error: "Convite expirou. Peça um novo." };
  }

  // E-mail logado tem que bater com o do convite (case-insensitive)
  const userEmail = (user.email ?? "").toLowerCase();
  const inviteEmail = invite.email.toLowerCase();
  if (userEmail !== inviteEmail) {
    return {
      ok: false,
      error: `Este convite foi enviado pra ${invite.email}. Você está logado como ${userEmail}.`,
      expected_email: invite.email,
    };
  }

  // Já é membro?
  const { data: existingMembership } = await admin
    .from("organization_members")
    .select("user_id")
    .eq("org_id", invite.org_id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (existingMembership) {
    // Marca convite como aceito mesmo assim e segue
    await admin
      .from("invitations")
      .update({
        status: "accepted",
        accepted_at: new Date().toISOString(),
        accepted_by: user.id,
      })
      .eq("id", invite.id);
    return { ok: true, org_id: invite.org_id };
  }

  // Cria membership
  const { error: memberErr } = await admin.from("organization_members").insert({
    org_id: invite.org_id,
    user_id: user.id,
    role: invite.role,
  });
  if (memberErr) {
    return { ok: false, error: `Falha ao criar membership: ${memberErr.message}` };
  }

  await admin
    .from("invitations")
    .update({
      status: "accepted",
      accepted_at: new Date().toISOString(),
      accepted_by: user.id,
    })
    .eq("id", invite.id);

  // Audit — best-effort (não falha o accept se audit_log estiver indisponível)
  try {
    await admin.from("audit_log").insert({
      org_id: invite.org_id,
      actor_id: user.id,
      actor_type: "user",
      action: "member.invited_accepted",
      entity_type: "organization_members",
      entity_id: user.id,
      payload: {
        invitation_id: invite.id,
        role: invite.role,
        email: invite.email,
      },
    });
  } catch {
    // ignore
  }

  revalidatePath("/dashboard");
  return { ok: true, org_id: invite.org_id };
}

/**
 * Wrapper que aceita o convite e redireciona pro dashboard.
 * Usado pelo botão "Aceitar" na landing /convite/[token].
 */
export async function acceptInvitationAndRedirectAction(token: string): Promise<void> {
  const r = await acceptInvitationAction({ token });
  if (!r.ok) {
    // Vai pro login com query de erro
    redirect(`/login?invite_error=${encodeURIComponent(r.error)}`);
  }
  redirect("/dashboard?welcome=invite");
}
