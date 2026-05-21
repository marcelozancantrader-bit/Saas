"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentOrg } from "@/server/services/current-org";
import { cancelSubscription, isAsaasEnabled } from "@/lib/billing/asaas";

const schema = z.object({
  reason: z.string().min(3).max(500).optional(),
});

export type CancelPlanInput = z.infer<typeof schema>;
export type CancelPlanResult =
  | { ok: true; ends_at: string | null; immediate: boolean }
  | { ok: false; error: string };

/**
 * Cancela o plano da org. Comportamento:
 *  - Asaas: chama DELETE /subscriptions/:id (interrompe cobranças futuras).
 *    Marca `cancel_at_period_end=true` localmente; usuário mantém acesso até
 *    `current_period_end`. Webhook `SUBSCRIPTION_DELETED` ou cron fará o
 *    downgrade pra free no fim do período.
 *  - Manual (Free/Agency/sem Asaas): downgrade imediato pra free + status='canceled'.
 */
export async function cancelPlanAction(raw: CancelPlanInput): Promise<CancelPlanResult> {
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Dados inválidos." };

  const supabase = await createClient();
  const me = await getCurrentOrg();
  if (me.role !== "owner" && me.role !== "admin") {
    return { ok: false, error: "Só owner ou admin pode cancelar o plano." };
  }

  const { data: activeSub } = await supabase
    .from("subscriptions")
    .select(
      "id, plano, status, provider, provider_subscription_id, current_period_end, cancel_at_period_end, meta",
    )
    .eq("org_id", me.orgId)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!activeSub) {
    return { ok: false, error: "Nenhum plano ativo encontrado pra cancelar." };
  }

  if (activeSub.cancel_at_period_end) {
    return {
      ok: false,
      error: "Plano já está agendado pra cancelar no fim do período.",
    };
  }

  const admin = createAdminClient();
  const h = await headers();
  const newMeta = {
    ...(((activeSub.meta as Record<string, unknown> | null) ?? {}) as Record<string, unknown>),
    canceled_by_user_id: me.userId,
    canceled_at: new Date().toISOString(),
    cancel_reason: parsed.data.reason ?? null,
  };

  if (activeSub.provider === "asaas" && activeSub.provider_subscription_id && isAsaasEnabled()) {
    const result = await cancelSubscription(activeSub.provider_subscription_id);
    if (!result.ok) return { ok: false, error: `Asaas: ${result.error}` };

    const { error: upErr } = await admin
      .from("subscriptions")
      .update({
        cancel_at_period_end: true,
        meta: newMeta,
        updated_at: new Date().toISOString(),
      })
      .eq("id", activeSub.id);
    if (upErr) return { ok: false, error: upErr.message };

    await admin.from("audit_log").insert({
      org_id: me.orgId,
      actor_id: me.userId,
      actor_type: "user",
      action: "subscription.cancel_scheduled",
      entity_type: "subscription",
      entity_id: activeSub.id,
      payload: {
        plano: activeSub.plano,
        reason: parsed.data.reason ?? null,
        ends_at: activeSub.current_period_end,
      },
      ip: h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
      user_agent: h.get("user-agent") ?? null,
    });

    revalidatePath("/billing");
    return {
      ok: true,
      ends_at: activeSub.current_period_end as string | null,
      immediate: false,
    };
  }

  const { error: subErr } = await admin
    .from("subscriptions")
    .update({
      status: "canceled",
      meta: newMeta,
      updated_at: new Date().toISOString(),
    })
    .eq("id", activeSub.id);
  if (subErr) return { ok: false, error: subErr.message };

  const { error: orgErr } = await admin
    .from("organizations")
    .update({ plano: "free", updated_at: new Date().toISOString() })
    .eq("id", me.orgId);
  if (orgErr) return { ok: false, error: orgErr.message };

  await admin.from("audit_log").insert({
    org_id: me.orgId,
    actor_id: me.userId,
    actor_type: "user",
    action: "subscription.canceled",
    entity_type: "subscription",
    entity_id: activeSub.id,
    payload: {
      previous_plano: activeSub.plano,
      provider: activeSub.provider,
      reason: parsed.data.reason ?? null,
    },
    ip: h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    user_agent: h.get("user-agent") ?? null,
  });

  revalidatePath("/");
  revalidatePath("/billing");
  return { ok: true, ends_at: null, immediate: true };
}
