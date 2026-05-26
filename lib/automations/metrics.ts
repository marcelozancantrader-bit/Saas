import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { METRIC_CATALOG, type MetricCatalogEntry } from "./metrics-catalog";

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
