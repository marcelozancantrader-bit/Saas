"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { assertPlatformAdminAndGetAdminClient } from "@/lib/auth/platform-admin";
import { env } from "@/lib/validators/env";

const schema = z.object({
  user_id: z.string().uuid(),
  reason: z.string().min(3).max(500),
});

/**
 * Inicia impersonation: gera magic link com o email do target user.
 * Admin abre em nova aba → vira o target user.
 *
 * Limitações dessa abordagem (MVP):
 *   - A sessão atual do admin se mantém na aba original (recomendamos abrir nova aba)
 *   - Não há banner persistente "modo impersonation" — depende do admin lembrar
 *   - Pra voltar a ser admin: logout + login normal
 */
export async function impersonateUserAction(input: z.infer<typeof schema>) {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }
  const { user_id, reason } = parsed.data;

  const { me, supabase } = await assertPlatformAdminAndGetAdminClient();

  if (user_id === me.id) {
    return { ok: false as const, error: "Você não pode impersonar a si mesmo." };
  }

  // 1. Carrega target user
  const { data: targetRes } = await supabase.auth.admin.getUserById(user_id);
  const targetEmail = targetRes?.user?.email;
  if (!targetRes?.user || !targetEmail) {
    return { ok: false as const, error: "Usuário alvo não encontrado." };
  }
  const target = { ...targetRes.user, email: targetEmail };

  // 2. Bloqueia impersonate de outro platform admin (preserva separação de poderes)
  const { data: pa } = await supabase
    .from("platform_admins")
    .select("user_id")
    .eq("user_id", user_id)
    .maybeSingle();
  if (pa) {
    return { ok: false as const, error: "Impersonate de outro platform admin é proibido." };
  }

  // 3. Gera magic link
  const redirectTo = `${env.NEXT_PUBLIC_APP_URL ?? "https://memorial-ai-mu.vercel.app"}/dashboard`;
  const { data: linkRes, error: linkErr } = await supabase.auth.admin.generateLink({
    type: "magiclink",
    email: target.email,
    options: { redirectTo },
  });
  if (linkErr || !linkRes?.properties?.action_link) {
    return { ok: false as const, error: linkErr?.message ?? "Falha ao gerar magic link." };
  }

  // 4. Audit log (ação iniciada)
  const h = await headers();
  await supabase.from("audit_log").insert({
    org_id: null, // ação platform-wide
    actor_id: me.id,
    actor_type: "platform_admin",
    action: "user.impersonate_started",
    entity_type: "user",
    entity_id: user_id,
    payload: {
      admin_email: me.email,
      target_email: target.email,
      reason,
    },
    ip: h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    user_agent: h.get("user-agent") ?? null,
  });

  return {
    ok: true as const,
    magic_link: linkRes.properties.action_link as string,
    target_email: target.email,
  };
}
