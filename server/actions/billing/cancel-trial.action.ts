"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentOrg } from "@/server/services/current-org";

export type CancelTrialResult = { ok: true } | { ok: false; error: string };

/**
 * Cancela trial ativo antes do prazo de 7 dias. Owner/admin only.
 *
 * Comportamento:
 *  1. Marca subscriptions.status='canceled' na sub trialing
 *  2. Downgrade organizations.plano = 'free' imediato
 *  3. Mantém trial_started_at (anti-abuse — user não pode reiniciar trial)
 *
 * O cron expired-trials-cron continua rodando mas vai ignorar essa sub
 * (status já canceled).
 */
export async function cancelTrialAction(): Promise<CancelTrialResult> {
  const me = await getCurrentOrg();
  if (me.role !== "owner" && me.role !== "admin") {
    return { ok: false, error: "Só owner ou admin pode cancelar o trial." };
  }

  const supabase = await createClient();

  // Verifica se há trial ativo
  const { data: trialingSub } = await supabase
    .from("subscriptions")
    .select("id, status, provider, current_period_end")
    .eq("org_id", me.orgId)
    .eq("status", "trialing")
    .eq("provider", "trial")
    .maybeSingle();

  if (!trialingSub) {
    return { ok: false, error: "Nenhum trial ativo encontrado." };
  }

  // Admin client pra bypassar RLS se necessário (sub é pessoal mas org plano
  // muda — segurança extra com service-role)
  const admin = createAdminClient();
  const now = new Date().toISOString();

  const { error: subErr } = await admin
    .from("subscriptions")
    .update({ status: "canceled", updated_at: now })
    .eq("id", trialingSub.id);
  if (subErr) return { ok: false, error: `Cancelar subscription falhou: ${subErr.message}` };

  const { error: orgErr } = await admin
    .from("organizations")
    .update({ plano: "free", updated_at: now })
    .eq("id", me.orgId);
  if (orgErr) return { ok: false, error: `Downgrade falhou: ${orgErr.message}` };

  // Audit
  await admin.from("audit_log").insert({
    org_id: me.orgId,
    actor_id: me.userId,
    actor_type: "user",
    action: "subscription.trial_canceled",
    entity_type: "subscription",
    entity_id: trialingSub.id,
    payload: { canceled_at: now, by: me.email, was_ending_at: trialingSub.current_period_end },
  });

  // Notification
  await admin.from("notifications").insert({
    org_id: me.orgId,
    user_id: null,
    type: "plan.trial_canceled",
    title: "Trial cancelado",
    body: `${me.email} cancelou o trial. Workspace voltou pro Free.`,
    link_url: "/billing",
  });

  revalidatePath("/billing");
  return { ok: true };
}
