"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentOrg } from "@/server/services/current-org";
import {
  isAsaasEnabled,
  createOrFindCustomer,
  createSubscription,
  getFirstSubscriptionPayment,
  customerAreaUrl,
} from "@/lib/billing/asaas";
import {
  PLANS,
  CYCLES,
  calculateCyclePrice,
  type PlanId,
  type BillingCycle,
} from "@/lib/plans/limits";

const schema = z.object({
  target_plan: z.enum(["free", "solo", "pro", "studio", "agency"]),
  cycle: z.enum(["monthly", "annual", "pix_annual"]).default("monthly"),
});

export type UpgradePlanInput = z.infer<typeof schema>;
export type UpgradePlanResult =
  | { ok: true; mode: "manual"; new_plan: PlanId }
  | { ok: true; mode: "asaas"; checkout_url: string }
  | { ok: false; error: string }
  | { ok: false; needs_cpf_cnpj: true };

/**
 * Upgrade/downgrade do plano da org. Comportamento:
 *  - Plano = 'free' ou 'agency': upgrade manual (Free é grátis, Agency é "contato comercial",
 *    sem cobrança automática neste sprint).
 *  - Outros planos com ASAAS_API_KEY: cria subscription via Asaas → cliente paga PIX.
 *    O webhook atualiza organizations.plano quando o pagamento confirma.
 *  - Outros planos sem ASAAS_API_KEY: upgrade manual (V0 / desenvolvimento).
 */
export async function upgradePlanAction(raw: UpgradePlanInput): Promise<UpgradePlanResult> {
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Plano inválido." };

  const supabase = await createClient();
  const me = await getCurrentOrg();
  if (me.role !== "owner" && me.role !== "admin") {
    return { ok: false, error: "Só owner ou admin pode mudar o plano." };
  }

  const targetPlan: PlanId = parsed.data.target_plan;
  const targetCycle: BillingCycle = parsed.data.cycle;
  const planInfo = PLANS[targetPlan];
  const cycleInfo = CYCLES[targetCycle];
  const cyclePrice = calculateCyclePrice(targetPlan, targetCycle);

  // Free e Agency: sem cobrança automática nesta versão.
  const wantsAsaas =
    isAsaasEnabled() && targetPlan !== "free" && targetPlan !== "agency" && planInfo.priceCents;

  if (wantsAsaas) {
    const { data: orgRow } = await supabase
      .from("organizations")
      .select("name, cnpj")
      .eq("id", me.orgId)
      .single();

    // Asaas exige CPF ou CNPJ pra criar cobrança. Bloqueia early com um
    // sinal estruturado pro client abrir um dialog pedindo o documento.
    const cpfCnpjRaw = (orgRow?.cnpj ?? "").replace(/\D+/g, "");
    if (!cpfCnpjRaw) {
      return { ok: false, needs_cpf_cnpj: true };
    }

    const customer = await createOrFindCustomer({
      name: orgRow?.name ?? me.orgName,
      email: me.email,
      cpfCnpj: cpfCnpjRaw,
      externalReference: me.orgId,
    });
    if (!customer.ok) return { ok: false, error: `Asaas: ${customer.error}` };

    // Para anual/pix_annual, cobra o valor total do ciclo de uma vez. Para mensal,
    // cobra o effectiveMonthly mês a mês (recorrente).
    const isAnnualCycle = targetCycle !== "monthly";
    const valueToCharge = isAnnualCycle
      ? (cyclePrice?.totalCycleCents ?? planInfo.priceCents!) / 100
      : (cyclePrice?.effectiveMonthlyCents ?? planInfo.priceCents!) / 100;

    const sub = await createSubscription({
      customer: customer.customerId,
      billingType: "PIX",
      value: valueToCharge,
      cycle: isAnnualCycle ? "YEARLY" : "MONTHLY",
      description: `Memorial.ai — plano ${planInfo.label} (${cycleInfo.label})`,
      externalReference: me.orgId,
      nextDueDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    });
    if (!sub.ok) return { ok: false, error: `Asaas: ${sub.error}` };

    // Registra como pending. O webhook confirma e atualiza organizations.plano.
    const admin = createAdminClient();
    const { error: insertErr } = await admin.from("subscriptions").insert({
      org_id: me.orgId,
      plano: targetPlan,
      status: "pending",
      provider: "asaas",
      provider_customer_id: customer.customerId,
      provider_subscription_id: sub.subscription.id,
      cycle: targetCycle,
      meta: {
        asaas_response: sub.subscription,
        discount_percent: cycleInfo.discountPercent,
        cycle_total_cents: cyclePrice?.totalCycleCents ?? null,
        effective_monthly_cents: cyclePrice?.effectiveMonthlyCents ?? null,
      },
    });
    if (insertErr) {
      console.error(`[upgrade-plan] failed to insert pending subscription: ${insertErr.message}`);
      return { ok: false, error: `Falha ao registrar assinatura: ${insertErr.message}` };
    }

    // Pega a fatura concreta do primeiro payment — URL com QR Code PIX / boleto.
    // Fallback: área genérica do cliente.
    const payment = await getFirstSubscriptionPayment(sub.subscription.id);
    const checkoutUrl = payment.ok ? payment.invoiceUrl : customerAreaUrl(customer.customerId);

    return {
      ok: true,
      mode: "asaas",
      checkout_url: checkoutUrl,
    };
  }

  // Upgrade manual (sem Asaas): atualiza plano direto + cria subscription manual.
  const admin = createAdminClient();
  const { error: orgErr } = await admin
    .from("organizations")
    .update({ plano: targetPlan, updated_at: new Date().toISOString() })
    .eq("id", me.orgId);
  if (orgErr) return { ok: false, error: orgErr.message };

  // Marca subscriptions ativas anteriores como canceladas
  await admin
    .from("subscriptions")
    .update({ status: "canceled" })
    .eq("org_id", me.orgId)
    .eq("status", "active");

  // Se org estava em trial, encerra também — converteu antes do prazo.
  await admin
    .from("subscriptions")
    .update({ status: "canceled" })
    .eq("org_id", me.orgId)
    .eq("status", "trialing")
    .eq("provider", "trial");

  await admin.from("subscriptions").insert({
    org_id: me.orgId,
    plano: targetPlan,
    status: "active",
    provider: "manual",
    cycle: targetCycle,
    current_period_start: new Date().toISOString(),
    current_period_end: new Date(
      Date.now() + cycleInfo.monthsCharged * 30 * 24 * 60 * 60 * 1000,
    ).toISOString(),
    meta: {
      reason: "manual_upgrade",
      changed_by: me.userId,
      discount_percent: cycleInfo.discountPercent,
    },
  });

  await admin.from("notifications").insert({
    org_id: me.orgId,
    type: "plan.upgraded",
    title: `Plano alterado para ${planInfo.label}`,
    body: `${me.email} alterou o plano da organização.`,
    link_url: "/billing",
  });

  revalidatePath("/");
  revalidatePath("/billing");
  return { ok: true, mode: "manual", new_plan: targetPlan };
}
