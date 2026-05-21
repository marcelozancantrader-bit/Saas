import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { PLANS, type PlanId } from "@/lib/plans/limits";

export type AdminSubRow = {
  id: string;
  org_id: string;
  org_name: string;
  plano: PlanId;
  status: string;
  provider: string;
  current_period_start: string | null;
  current_period_end: string | null;
  created_at: string;
  meta: Record<string, unknown> | null;
};

export async function loadAdminSubscriptionList(opts: {
  status?: string;
  plano?: PlanId | "all";
  provider?: string;
  page?: number;
}): Promise<{ rows: AdminSubRow[]; total: number }> {
  const supabase = createAdminClient();
  const page = opts.page ?? 1;
  const pageSize = 50;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let q = supabase
    .from("subscriptions")
    .select(
      "id, org_id, plano, status, provider, current_period_start, current_period_end, created_at, meta",
      { count: "exact" },
    );

  if (opts.status && opts.status !== "all") q = q.eq("status", opts.status);
  if (opts.plano && opts.plano !== "all") q = q.eq("plano", opts.plano);
  if (opts.provider && opts.provider !== "all") q = q.eq("provider", opts.provider);

  q = q.order("created_at", { ascending: false }).range(from, to);

  const { data: subs, count } = await q;
  const subsTyped = (subs ?? []) as Omit<AdminSubRow, "org_name">[];

  if (subsTyped.length === 0) {
    return { rows: [], total: count ?? 0 };
  }

  const orgIds = Array.from(new Set(subsTyped.map((s) => s.org_id)));
  const { data: orgs } = await supabase.from("organizations").select("id, name").in("id", orgIds);
  const orgNameById = new Map<string, string>();
  for (const o of (orgs ?? []) as { id: string; name: string }[]) {
    orgNameById.set(o.id, o.name);
  }

  const rows: AdminSubRow[] = subsTyped.map((s) => ({
    ...s,
    plano: s.plano as PlanId,
    org_name: orgNameById.get(s.org_id) ?? "(org removida)",
  }));

  return { rows, total: count ?? rows.length };
}

export type AdminSubsKpis = {
  active: number;
  past_due: number;
  trialing: number;
  canceled: number;
  pending: number;
  totalMrrCents: number;
};

export async function loadAdminSubsKpis(): Promise<AdminSubsKpis> {
  const supabase = createAdminClient();
  const { data } = await supabase.from("subscriptions").select("plano, status");
  const rows = (data ?? []) as { plano: string; status: string }[];

  const kpis: AdminSubsKpis = {
    active: 0,
    past_due: 0,
    trialing: 0,
    canceled: 0,
    pending: 0,
    totalMrrCents: 0,
  };

  for (const r of rows) {
    if (r.status === "active") kpis.active++;
    else if (r.status === "past_due") kpis.past_due++;
    else if (r.status === "trialing") kpis.trialing++;
    else if (r.status === "canceled") kpis.canceled++;
    else if (r.status === "pending") kpis.pending++;

    if (r.status === "active") {
      const plan = PLANS[r.plano as PlanId];
      kpis.totalMrrCents += plan?.priceCents ?? 0;
    }
  }

  return kpis;
}
