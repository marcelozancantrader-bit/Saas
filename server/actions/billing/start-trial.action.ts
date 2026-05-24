"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentOrg } from "@/server/services/current-org";
import { captureServer } from "@/lib/observability/posthog";
import { TRIAL_PLAN, TRIAL_DAYS } from "@/lib/billing/trial";
import { PLANS } from "@/lib/plans/limits";

export type StartTrialResult =
  | { ok: true; ends_at: string; plan: typeof TRIAL_PLAN }
  | { ok: false; error: string };

/**
 * Inicia o trial pré-pago de 7 dias no plano Pro.
 *
 * Regras:
 *  - Só owner/admin.
 *  - Org tem que estar no plano free.
 *  - organizations.trial_started_at IS NULL (1 trial por org lifetime).
 *  - Sem cobrança no Asaas — provider='trial'.
 *
 * Efeitos:
 *  - subscriptions insert (status='trialing', current_period_end=now+7d)
 *  - organizations.plano = TRIAL_PLAN, trial_started_at = now
 *  - notification org-wide
 *  - audit_log
 *  - PostHog event (subscription.trial_started)
 *
 * Conversão e expiração ficam para outro lugar:
 *  - Conversão: usuário aperta "Mudar para este plano" antes de expirar
 *    (upgrade-plan.action cuida normalmente, Asaas cria sub paga e nosso
 *    cron simplesmente não acha sub trialing porque a org já não está mais
 *    em trial).
 *  - Expiração: cron expired-trials-cron, diário.
 */
export async function startTrialAction(): Promise<StartTrialResult> {
  const supabase = await createClient();
  const me = await getCurrentOrg();
  if (me.role !== "owner" && me.role !== "admin") {
    return { ok: false, error: "Só owner ou admin pode iniciar o trial." };
  }

  const { data: orgRow, error: orgFetchErr } = await supabase
    .from("organizations")
    .select("plano, trial_started_at")
    .eq("id", me.orgId)
    .single<{ plano: string; trial_started_at: string | null }>();
  if (orgFetchErr || !orgRow) {
    return { ok: false, error: "Não foi possível carregar a organização." };
  }

  if (orgRow.trial_started_at) {
    return {
      ok: false,
      error: "Sua organização já usou o trial. Faça upgrade direto pelo card Pro.",
    };
  }
  if (orgRow.plano !== "free") {
    return {
      ok: false,
      error: "Trial só pode ser iniciado a partir do plano Free.",
    };
  }

  const now = new Date();
  const endsAt = new Date(now.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);

  const admin = createAdminClient();

  // Cria subscription trialing primeiro — se falhar, org não foi tocada.
  const { data: subRow, error: subErr } = await admin
    .from("subscriptions")
    .insert({
      org_id: me.orgId,
      plano: TRIAL_PLAN,
      status: "trialing",
      provider: "trial",
      current_period_start: now.toISOString(),
      current_period_end: endsAt.toISOString(),
      meta: { trial_started_by: me.userId, trial_days: TRIAL_DAYS },
    })
    .select("id")
    .single<{ id: string }>();

  if (subErr || !subRow) {
    return {
      ok: false,
      error: `Falha ao registrar trial: ${subErr?.message ?? "desconhecido"}`,
    };
  }

  // Upgrade do plano + marca anti-abuse.
  const { error: orgUpdErr } = await admin
    .from("organizations")
    .update({
      plano: TRIAL_PLAN,
      trial_started_at: now.toISOString(),
      updated_at: now.toISOString(),
    })
    .eq("id", me.orgId);

  if (orgUpdErr) {
    // Rollback da sub pra não deixar inconsistência.
    await admin.from("subscriptions").delete().eq("id", subRow.id);
    return {
      ok: false,
      error: `Falha ao atualizar organização: ${orgUpdErr.message}`,
    };
  }

  await admin.from("notifications").insert({
    org_id: me.orgId,
    user_id: null,
    type: "plan.trial_started",
    title: `Trial ${PLANS[TRIAL_PLAN].label} iniciado`,
    body: `Você desbloqueou ${TRIAL_DAYS} dias do plano ${PLANS[TRIAL_PLAN].label} sem cartão. Acaba em ${endsAt.toLocaleDateString("pt-BR")}.`,
    link_url: "/billing",
    meta: { trial_ends_at: endsAt.toISOString(), plan: TRIAL_PLAN },
  });

  const h = await headers();
  await admin.from("audit_log").insert({
    org_id: me.orgId,
    actor_id: me.userId,
    actor_type: "user",
    action: "subscription.trial_started",
    entity_type: "subscription",
    entity_id: subRow.id,
    payload: {
      plano: TRIAL_PLAN,
      trial_days: TRIAL_DAYS,
      ends_at: endsAt.toISOString(),
    },
    ip: h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    user_agent: h.get("user-agent") ?? null,
  });

  void captureServer({
    event: "subscription.trial_started",
    distinctId: me.userId,
    orgId: me.orgId,
    properties: {
      plan: TRIAL_PLAN,
      trial_days: TRIAL_DAYS,
      ends_at: endsAt.toISOString(),
    },
  });

  revalidatePath("/");
  revalidatePath("/billing");
  revalidatePath("/dashboard");
  return { ok: true, ends_at: endsAt.toISOString(), plan: TRIAL_PLAN };
}
