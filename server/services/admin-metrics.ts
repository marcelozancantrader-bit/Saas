import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { PLAN_ORDER, type PlanId } from "@/lib/plans/limits";
import {
  type ActiveSubscription,
  calculateMrrCents,
  calculateArrCents,
  calculatePayingCustomers,
  calculateArpuCents,
  calculateMonthlyChurnRate,
  calculateLtvCents,
  calculatePlanDistribution,
  calculateFreeToPaidConversion,
  type PlanDistribution,
} from "@/lib/admin/saas-metrics";

export type SaasOverviewMetrics = {
  // Core SaaS
  mrrCents: number;
  arrCents: number;
  arpuCents: number;
  payingCustomers: number;
  monthlyChurnRate: number;
  ltvCents: number;
  // Volume
  totalOrganizations: number;
  paidOrganizations: number;
  freeOrganizations: number;
  totalUsers: number;
  totalProjects: number;
  totalDocsThisMonth: number;
  // Growth
  newSignupsThisMonth: number;
  newSignupsPrevMonth: number;
  freeToPaidConversion: number;
  // Mix
  planDistribution: PlanDistribution[];
  // Time-series
  mrrHistory12m: MonthlyPoint[];
  signupsHistory12m: MonthlyPoint[];
};

export type MonthlyPoint = {
  /** Primeiro dia do mês em ISO (yyyy-mm-01) */
  month: string;
  /** Label PT-BR curto (ex.: "jan/26") */
  label: string;
  value: number;
};

function startOfMonth(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

function addMonths(d: Date, n: number): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + n, 1));
}

function isoMonth(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-01`;
}

const MONTH_LABELS_PT = [
  "jan",
  "fev",
  "mar",
  "abr",
  "mai",
  "jun",
  "jul",
  "ago",
  "set",
  "out",
  "nov",
  "dez",
];

function monthLabel(d: Date): string {
  return `${MONTH_LABELS_PT[d.getUTCMonth()]}/${String(d.getUTCFullYear()).slice(-2)}`;
}

export async function loadSaasOverviewMetrics(): Promise<SaasOverviewMetrics> {
  const supabase = createAdminClient();
  const now = new Date();
  const monthStart = startOfMonth(now);
  const prevMonthStart = addMonths(monthStart, -1);
  const twelveMonthsAgo = addMonths(monthStart, -11);

  const [
    activeSubsRes,
    orgsRes,
    membersRes,
    projectsRes,
    docsThisMonthRes,
    subsAllRes,
    orgsCreated12mRes,
  ] = await Promise.all([
    supabase.from("subscriptions").select("org_id, plano, status").eq("status", "active"),
    supabase.from("organizations").select("id, plano, created_at"),
    supabase.from("organization_members").select("user_id", { count: "exact", head: true }),
    supabase.from("projects").select("id", { count: "exact", head: true }),
    supabase
      .from("documents")
      .select("id", { count: "exact", head: true })
      .gte("created_at", monthStart.toISOString()),
    supabase.from("subscriptions").select("id, org_id, plano, status, created_at, updated_at"),
    supabase
      .from("organizations")
      .select("id, created_at")
      .gte("created_at", twelveMonthsAgo.toISOString()),
  ]);

  const activeSubs: ActiveSubscription[] = (activeSubsRes.data ?? []).map(
    (s: { org_id: string; plano: string; status: string }) => ({
      org_id: s.org_id,
      plano: s.plano as PlanId,
      status: s.status,
    }),
  );

  const orgs = orgsRes.data ?? [];
  const allSubs = subsAllRes.data ?? [];
  const orgsCreated12m = orgsCreated12mRes.data ?? [];

  // Core SaaS
  const mrrCents = calculateMrrCents(activeSubs);
  const arrCents = calculateArrCents(mrrCents);
  const payingCustomers = calculatePayingCustomers(activeSubs);
  const arpuCents = calculateArpuCents(mrrCents, payingCustomers);

  type SubRow = {
    id: string;
    org_id: string;
    plano: string;
    status: string;
    created_at: string;
    updated_at: string;
  };
  const allSubsTyped = allSubs as unknown as SubRow[];

  // Churn: subs ativas no início do mês atual - quantas foram canceladas durante este mês
  const activeAtMonthStart = allSubsTyped.filter((s) => {
    const created = new Date(s.created_at);
    if (created >= monthStart) return false;
    if (s.status === "active") return true;
    if (
      (s.status === "canceled" || s.status === "past_due") &&
      new Date(s.updated_at) >= monthStart
    ) {
      return true;
    }
    return false;
  }).length;

  const canceledThisMonth = allSubsTyped.filter((s) => {
    return (
      (s.status === "canceled" || s.status === "past_due") && new Date(s.updated_at) >= monthStart
    );
  }).length;

  const monthlyChurnRate = calculateMonthlyChurnRate(activeAtMonthStart, canceledThisMonth);
  const ltvCents = calculateLtvCents(arpuCents, monthlyChurnRate);

  // Volume
  const totalOrganizations = orgs.length;
  const paidOrganizations = orgs.filter((o: { plano: string }) => o.plano !== "free").length;
  const freeOrganizations = orgs.filter((o: { plano: string }) => o.plano === "free").length;
  const totalUsers = membersRes.count ?? 0;
  const totalProjects = projectsRes.count ?? 0;
  const totalDocsThisMonth = docsThisMonthRes.count ?? 0;

  // Growth
  const newSignupsThisMonth = orgs.filter(
    (o: { created_at: string }) => new Date(o.created_at) >= monthStart,
  ).length;
  const newSignupsPrevMonth = orgs.filter((o: { created_at: string }) => {
    const c = new Date(o.created_at);
    return c >= prevMonthStart && c < monthStart;
  }).length;

  // Conversion: orgs criadas há >= 7 dias e que estão em plano pago
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const eligibleOrgs = orgs.filter(
    (o: { created_at: string }) => new Date(o.created_at) <= sevenDaysAgo,
  );
  const eligiblePaid = eligibleOrgs.filter((o: { plano: string }) => o.plano !== "free");
  const freeToPaidConversion = calculateFreeToPaidConversion(
    eligibleOrgs.length,
    eligiblePaid.length,
  );

  // Mix
  const orgsByPlan: Record<PlanId, number> = {
    free: 0,
    solo: 0,
    pro: 0,
    studio: 0,
    agency: 0,
  };
  for (const o of orgs) {
    const p = (o.plano as PlanId) ?? "free";
    if (p in orgsByPlan) orgsByPlan[p] += 1;
  }
  const planDistribution = calculatePlanDistribution(orgsByPlan);

  // Time-series: signups por mês (últimos 12 meses)
  const signupsHistory12m: MonthlyPoint[] = [];
  for (let i = 0; i < 12; i++) {
    const m = addMonths(twelveMonthsAgo, i);
    const next = addMonths(m, 1);
    const count = orgsCreated12m.filter((o: { created_at: string }) => {
      const c = new Date(o.created_at);
      return c >= m && c < next;
    }).length;
    signupsHistory12m.push({
      month: isoMonth(m),
      label: monthLabel(m),
      value: count,
    });
  }

  // MRR history aproximado: reconstrói olhando subs ativas em cada mês
  // (snapshot ingênuo — subs antigas que ainda estão active assumem que sempre estiveram)
  const mrrHistory12m: MonthlyPoint[] = [];
  for (let i = 0; i < 12; i++) {
    const m = addMonths(twelveMonthsAgo, i);
    const next = addMonths(m, 1);
    const subsActiveInMonth = allSubsTyped.filter((s) => {
      const created = new Date(s.created_at);
      if (created >= next) return false;
      if (s.status === "active") return true;
      if (s.status === "canceled" || s.status === "past_due") {
        return new Date(s.updated_at) >= next;
      }
      return false;
    });
    const subsForMrr: ActiveSubscription[] = subsActiveInMonth.map((s) => ({
      org_id: s.org_id,
      plano: s.plano as PlanId,
      status: "active",
    }));
    mrrHistory12m.push({
      month: isoMonth(m),
      label: monthLabel(m),
      value: calculateMrrCents(subsForMrr),
    });
  }

  return {
    mrrCents,
    arrCents,
    arpuCents,
    payingCustomers,
    monthlyChurnRate,
    ltvCents,
    totalOrganizations,
    paidOrganizations,
    freeOrganizations,
    totalUsers,
    totalProjects,
    totalDocsThisMonth,
    newSignupsThisMonth,
    newSignupsPrevMonth,
    freeToPaidConversion,
    planDistribution,
    mrrHistory12m,
    signupsHistory12m,
  };
}

// Helper para deltas (% vs mês anterior)
export function calculateGrowthDelta(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 1 : 0;
  return (current - previous) / previous;
}

// Re-export utility used by `PLAN_ORDER` consumers (admin page imports just this).
export { PLAN_ORDER };
