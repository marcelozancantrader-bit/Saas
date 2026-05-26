import "server-only";
import Big from "big.js";
import type { SupabaseClient } from "@supabase/supabase-js";
import { METRIC_CATALOG, type MetricCatalogEntry } from "./metrics-catalog";
import { PLANS, type PlanId } from "@/lib/plans/limits";

/**
 * Implementações server-only das funções `compute` por métrica.
 * Para metadata (label/desc/unit/category) que precisa ir pra UI cliente,
 * use `metrics-catalog.ts` direto.
 */

function isoHoursAgo(hours: number): string {
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
}

async function aiCostUsdLast24h(admin: SupabaseClient): Promise<number> {
  const { data, error } = await admin
    .from("documents")
    .select("custo_tokens, created_at")
    .gte("created_at", isoHoursAgo(24));
  if (error) throw new Error(`metrics.ai.cost_usd_24h: ${error.message}`);
  let total = 0;
  for (const row of data ?? []) {
    const ct = (row as { custo_tokens: { cost_usd?: number } | null }).custo_tokens;
    if (ct && typeof ct.cost_usd === "number") total += ct.cost_usd;
  }
  return total;
}

async function aiCostUsdLast1h(admin: SupabaseClient): Promise<number> {
  const { data, error } = await admin
    .from("documents")
    .select("custo_tokens, created_at")
    .gte("created_at", isoHoursAgo(1));
  if (error) throw new Error(`metrics.ai.cost_usd_1h: ${error.message}`);
  let total = 0;
  for (const row of data ?? []) {
    const ct = (row as { custo_tokens: { cost_usd?: number } | null }).custo_tokens;
    if (ct && typeof ct.cost_usd === "number") total += ct.cost_usd;
  }
  return total;
}

async function signupsLast24h(admin: SupabaseClient): Promise<number> {
  const { count, error } = await admin
    .from("organizations")
    .select("id", { head: true, count: "exact" })
    .gte("created_at", isoHoursAgo(24));
  if (error) throw new Error(`metrics.signups_24h: ${error.message}`);
  return count ?? 0;
}

async function signupsLast1h(admin: SupabaseClient): Promise<number> {
  const { count, error } = await admin
    .from("organizations")
    .select("id", { head: true, count: "exact" })
    .gte("created_at", isoHoursAgo(1));
  if (error) throw new Error(`metrics.signups_1h: ${error.message}`);
  return count ?? 0;
}

async function paymentsOverdueNow(admin: SupabaseClient): Promise<number> {
  const { count, error } = await admin
    .from("subscriptions")
    .select("id", { head: true, count: "exact" })
    .eq("status", "past_due");
  if (error) throw new Error(`metrics.payments_overdue_now: ${error.message}`);
  return count ?? 0;
}

async function subscriptionsActiveNow(admin: SupabaseClient): Promise<number> {
  const { count, error } = await admin
    .from("subscriptions")
    .select("id", { head: true, count: "exact" })
    .eq("status", "active");
  if (error) throw new Error(`metrics.subscriptions_active: ${error.message}`);
  return count ?? 0;
}

async function trialsActiveNow(admin: SupabaseClient): Promise<number> {
  const { count, error } = await admin
    .from("subscriptions")
    .select("id", { head: true, count: "exact" })
    .eq("status", "trialing");
  if (error) throw new Error(`metrics.trials_active: ${error.message}`);
  return count ?? 0;
}

async function documentsGeneratedLast24h(admin: SupabaseClient): Promise<number> {
  const { count, error } = await admin
    .from("documents")
    .select("id", { head: true, count: "exact" })
    .gte("created_at", isoHoursAgo(24));
  if (error) throw new Error(`metrics.documents_24h: ${error.message}`);
  return count ?? 0;
}

async function automationRunsFailedLast24h(admin: SupabaseClient): Promise<number> {
  const { count, error } = await admin
    .from("admin_automation_runs")
    .select("id", { head: true, count: "exact" })
    .eq("status", "failed")
    .gte("started_at", isoHoursAgo(24));
  if (error) throw new Error(`metrics.automation_failed_24h: ${error.message}`);
  return count ?? 0;
}

/**
 * MRR estimado em BRL — soma normalizada mensal de todas subscriptions
 * status='active', considerando desconto por ciclo.
 *
 * Monthly: contribui priceCents/100 por mês.
 * Annual (-20%): contribui (priceCents * 12 * 0.80) / 12 = priceCents * 0.80.
 * PIX annual (-25%): contribui priceCents * 0.75.
 *
 * Big.js evita drift de float ao multiplicar/dividir centavos.
 */
async function revenueBrlMrrNow(admin: SupabaseClient): Promise<number> {
  const { data, error } = await admin
    .from("subscriptions")
    .select("plano, cycle")
    .eq("status", "active");
  if (error) throw new Error(`metrics.revenue_brl_mrr_now: ${error.message}`);
  return sumMonthlyContribution(
    (data ?? []) as Array<{ plano: string | null; cycle: string | null }>,
  );
}

/**
 * Receita "em risco" — soma normalizada mensal das subscriptions past_due.
 * Mostra quanto está prestes a sumir se a cobrança não rolar.
 */
async function revenueBrlAtRiskOverdueNow(admin: SupabaseClient): Promise<number> {
  const { data, error } = await admin
    .from("subscriptions")
    .select("plano, cycle")
    .eq("status", "past_due");
  if (error) throw new Error(`metrics.revenue_brl_at_risk: ${error.message}`);
  return sumMonthlyContribution(
    (data ?? []) as Array<{ plano: string | null; cycle: string | null }>,
  );
}

function cycleDiscountFactor(cycle: string | null): Big {
  switch (cycle) {
    case "annual":
      return new Big("0.80");
    case "pix_annual":
      return new Big("0.75");
    case "monthly":
    default:
      return new Big("1");
  }
}

function sumMonthlyContribution(
  rows: Array<{ plano: string | null; cycle: string | null }>,
): number {
  let total = new Big(0);
  for (const row of rows) {
    const planId = row.plano as PlanId | null;
    if (!planId) continue;
    const plan = PLANS[planId];
    if (!plan || plan.priceCents == null) continue; // agency/free skip
    const cents = new Big(plan.priceCents).times(cycleDiscountFactor(row.cycle));
    total = total.plus(cents.div(100));
  }
  return Number(total.round(2).toString());
}

async function documentsFailedLast24h(admin: SupabaseClient): Promise<number> {
  const { count, error } = await admin
    .from("project_files")
    .select("id", { head: true, count: "exact" })
    .eq("extracao_status", "erro")
    .gte("created_at", isoHoursAgo(24));
  if (error) throw new Error(`metrics.documents_failed_24h: ${error.message}`);
  return count ?? 0;
}

async function storageUsedBytesNow(admin: SupabaseClient): Promise<number> {
  try {
    const { data, error } = await admin.schema("storage").from("objects").select("metadata");
    if (error) throw error;
    const rows = (data ?? []) as Array<{ metadata: { size?: number } | null }>;
    let total = 0;
    for (const r of rows) {
      if (typeof r.metadata?.size === "number") total += r.metadata.size;
    }
    return total;
  } catch (err) {
    throw new Error(
      `metrics.storage_used_bytes: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

async function usersCountActiveNow(admin: SupabaseClient): Promise<number> {
  const { count, error } = await admin
    .from("organization_members")
    .select("user_id", { head: true, count: "exact" });
  if (error) throw new Error(`metrics.users_count_active: ${error.message}`);
  return count ?? 0;
}

/**
 * Taxa de conversão trial → paid nos últimos 30 dias.
 * Denominador: trials que iniciaram nesse período (organizations.meta.trial_started_at).
 * Numerador: dos mesmos, quantos têm subscription status='active' agora.
 * Retorna percentual 0..100.
 */
async function trialToActiveRate30d(admin: SupabaseClient): Promise<number> {
  const sinceIso = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await admin
    .from("organizations")
    .select("id, meta, subscriptions(status)")
    .gte("created_at", sinceIso);
  if (error) throw new Error(`metrics.trial_to_active_30d: ${error.message}`);
  const rows = (data ?? []) as Array<{
    id: string;
    meta: { trial_started_at?: string } | null;
    subscriptions: Array<{ status: string }> | null;
  }>;
  const trialed = rows.filter((r) => !!r.meta?.trial_started_at);
  if (trialed.length === 0) return 0;
  const converted = trialed.filter((r) =>
    (r.subscriptions ?? []).some((s) => s.status === "active"),
  );
  return Number(((converted.length * 100) / trialed.length).toFixed(2));
}

const COMPUTERS: Record<string, (admin: SupabaseClient) => Promise<number>> = {
  "ai.cost_usd_24h": aiCostUsdLast24h,
  "ai.cost_usd_1h": aiCostUsdLast1h,
  "signups.count_24h": signupsLast24h,
  "signups.count_1h": signupsLast1h,
  "payments.overdue_count_now": paymentsOverdueNow,
  "subscriptions.active_count_now": subscriptionsActiveNow,
  "trials.active_count_now": trialsActiveNow,
  "documents.generated_count_24h": documentsGeneratedLast24h,
  "automations.failed_count_24h": automationRunsFailedLast24h,
  "revenue.brl_mrr_now": revenueBrlMrrNow,
  "revenue.brl_at_risk_overdue_now": revenueBrlAtRiskOverdueNow,
  "documents.failed_count_24h": documentsFailedLast24h,
  "storage.used_bytes_now": storageUsedBytesNow,
  "users.count_active_now": usersCountActiveNow,
  "conversion.trial_to_active_rate_30d": trialToActiveRate30d,
};

export async function computeMetric(metricId: string, admin: SupabaseClient): Promise<number> {
  const compute = COMPUTERS[metricId];
  if (!compute) throw new Error(`Métrica desconhecida: ${metricId}`);
  return compute(admin);
}

export function isKnownMetric(metricId: string): boolean {
  return metricId in COMPUTERS && metricId in METRIC_CATALOG;
}

export type { MetricCatalogEntry };
