/**
 * Memorial.ai — Cálculos puros de métricas SaaS para o painel /admin.
 *
 * Funções stateless. Recebem dados já buscados do DB e retornam valores derivados.
 * Não fazem I/O — devem ser chamadas a partir de server/services/admin-metrics.ts
 * (que faz as queries).
 *
 * Fórmulas de referência:
 *   MRR  = soma do preço mensal de todas as subs com status='active'
 *   ARR  = MRR * 12
 *   ARPU = MRR / (# customers pagos)
 *   Churn mensal (logo) = subs canceladas no mês / subs ativas no início do mês
 *   LTV  = ARPU / churn mensal (aproximação simples)
 */

import { PLANS, type PlanId } from "@/lib/plans/limits";

export type ActiveSubscription = {
  org_id: string;
  plano: PlanId;
  status: string;
};

/**
 * Soma o preço mensal das subscriptions pagas ativas. Em centavos BRL.
 * Free e Agency (priceCents null) não entram (Free é grátis; Agency é negociado).
 */
export function calculateMrrCents(subs: ActiveSubscription[]): number {
  let total = 0;
  for (const s of subs) {
    if (s.status !== "active") continue;
    const plan = PLANS[s.plano];
    if (!plan || !plan.priceCents || plan.priceCents === 0) continue;
    total += plan.priceCents;
  }
  return total;
}

export function calculateArrCents(mrrCents: number): number {
  return mrrCents * 12;
}

export function calculatePayingCustomers(subs: ActiveSubscription[]): number {
  const orgIds = new Set<string>();
  for (const s of subs) {
    if (s.status !== "active") continue;
    const plan = PLANS[s.plano];
    if (!plan || !plan.priceCents || plan.priceCents === 0) continue;
    orgIds.add(s.org_id);
  }
  return orgIds.size;
}

export function calculateArpuCents(mrrCents: number, payingCustomers: number): number {
  if (payingCustomers === 0) return 0;
  return Math.round(mrrCents / payingCustomers);
}

/**
 * Churn mensal simples: % de subs ativas no início do mês que foram canceladas durante o mês.
 * Retorna fração (0.05 = 5%).
 */
export function calculateMonthlyChurnRate(
  activeAtMonthStart: number,
  canceledDuringMonth: number,
): number {
  if (activeAtMonthStart === 0) return 0;
  return canceledDuringMonth / activeAtMonthStart;
}

/**
 * LTV em centavos = ARPU / churn mensal.
 * Se churn = 0, retorna ARPU * 24 (assume retenção mínima de 2 anos como teto razoável).
 */
export function calculateLtvCents(arpuCents: number, monthlyChurnRate: number): number {
  if (monthlyChurnRate <= 0) return arpuCents * 24;
  return Math.round(arpuCents / monthlyChurnRate);
}

/**
 * Distribuição de orgs por plano (independente de subscription).
 */
export type PlanDistribution = {
  plano: PlanId;
  label: string;
  count: number;
  mrrContributionCents: number;
};

export function calculatePlanDistribution(orgsByPlan: Record<PlanId, number>): PlanDistribution[] {
  return (Object.keys(PLANS) as PlanId[]).map((planId) => {
    const count = orgsByPlan[planId] ?? 0;
    const plan = PLANS[planId];
    const mrr = (plan.priceCents ?? 0) * count;
    return {
      plano: planId,
      label: plan.label,
      count,
      mrrContributionCents: mrr,
    };
  });
}

/**
 * Conversão Free → Paid: % das orgs criadas há ≥ 7 dias que estão em algum plano pago.
 */
export function calculateFreeToPaidConversion(totalOrgsEligible: number, paidOrgs: number): number {
  if (totalOrgsEligible === 0) return 0;
  return paidOrgs / totalOrgsEligible;
}

export function formatBrl(cents: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

export function formatBrlCompact(cents: number): string {
  const value = cents / 100;
  if (value >= 1_000_000) {
    return `R$ ${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 1_000) {
    return `R$ ${(value / 1_000).toFixed(1)}k`;
  }
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatPercent(fraction: number, digits = 1): string {
  return `${(fraction * 100).toFixed(digits)}%`;
}
