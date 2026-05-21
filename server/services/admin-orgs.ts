import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { PLANS, type PlanId } from "@/lib/plans/limits";

export type AdminOrgListRow = {
  id: string;
  name: string;
  cnpj: string | null;
  plano: PlanId;
  created_at: string;
  member_count: number;
  project_count: number;
  doc_count: number;
  is_suspended: boolean;
  owner_email: string | null;
  last_activity: string | null;
};

export type AdminOrgListResult = {
  rows: AdminOrgListRow[];
  total: number;
};

type OrgRow = {
  id: string;
  name: string;
  cnpj: string | null;
  plano: string;
  created_at: string;
  meta: Record<string, unknown> | null;
};

/**
 * Lista paginada de organizações com KPIs agregados.
 * Filtros suportados:
 *   - q: busca por nome ou CNPJ
 *   - plano: filtra por plano específico
 *   - onlyPaid: só não-free
 *   - onlySuspended: só suspensas (meta.suspended_at)
 */
export async function loadAdminOrgList(opts: {
  q?: string;
  plano?: PlanId | "all";
  onlyPaid?: boolean;
  onlySuspended?: boolean;
  page?: number;
  pageSize?: number;
}): Promise<AdminOrgListResult> {
  const supabase = createAdminClient();
  const page = opts.page ?? 1;
  const pageSize = opts.pageSize ?? 25;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let q = supabase
    .from("organizations")
    .select("id, name, cnpj, plano, created_at, meta", { count: "exact" });

  if (opts.q && opts.q.trim().length > 0) {
    const term = opts.q.trim();
    q = q.or(`name.ilike.%${term}%,cnpj.ilike.%${term}%`);
  }
  if (opts.plano && opts.plano !== "all") {
    q = q.eq("plano", opts.plano);
  }
  if (opts.onlyPaid) {
    q = q.neq("plano", "free");
  }

  q = q.order("created_at", { ascending: false }).range(from, to);

  const { data: orgs, count } = await q;
  const orgsTyped = (orgs ?? []) as OrgRow[];

  // Filtro pós-query pra suspended (meta jsonb não dá pra filtrar bem via .filter no client)
  const filtered = opts.onlySuspended
    ? orgsTyped.filter((o) => Boolean(o.meta?.suspended_at))
    : orgsTyped;

  if (filtered.length === 0) {
    return { rows: [], total: count ?? 0 };
  }

  const orgIds = filtered.map((o) => o.id);

  const [membersRes, projectsRes, docsRes, ownersRes] = await Promise.all([
    supabase.from("organization_members").select("org_id, user_id").in("org_id", orgIds),
    supabase.from("projects").select("org_id, updated_at").in("org_id", orgIds),
    supabase
      .from("documents")
      .select("id, project_id, projects!inner(org_id)")
      .in("projects.org_id", orgIds),
    supabase
      .from("organization_members")
      .select("org_id, user_id, role")
      .in("org_id", orgIds)
      .eq("role", "owner"),
  ]);

  const members = (membersRes.data ?? []) as { org_id: string; user_id: string }[];
  const projects = (projectsRes.data ?? []) as { org_id: string; updated_at: string }[];
  // Supabase devolve relacionados como array; achatamos para pegar o primeiro.
  const docs = (docsRes.data ?? []) as unknown as {
    id: string;
    projects: { org_id: string } | { org_id: string }[];
  }[];
  const owners = (ownersRes.data ?? []) as { org_id: string; user_id: string }[];

  // Resolve e-mails dos owners via admin auth API
  const ownerEmailByOrg = new Map<string, string | null>();
  for (const o of owners) {
    if (ownerEmailByOrg.has(o.org_id)) continue;
    try {
      const { data } = await supabase.auth.admin.getUserById(o.user_id);
      ownerEmailByOrg.set(o.org_id, data.user?.email ?? null);
    } catch {
      ownerEmailByOrg.set(o.org_id, null);
    }
  }

  const memberCountByOrg = new Map<string, number>();
  for (const m of members) {
    memberCountByOrg.set(m.org_id, (memberCountByOrg.get(m.org_id) ?? 0) + 1);
  }

  const projectsByOrg = new Map<string, { count: number; lastActivity: string | null }>();
  for (const p of projects) {
    const cur = projectsByOrg.get(p.org_id) ?? { count: 0, lastActivity: null };
    cur.count += 1;
    if (!cur.lastActivity || p.updated_at > cur.lastActivity) {
      cur.lastActivity = p.updated_at;
    }
    projectsByOrg.set(p.org_id, cur);
  }

  const docCountByOrg = new Map<string, number>();
  for (const d of docs) {
    const rel = d.projects;
    const orgId = Array.isArray(rel) ? rel[0]?.org_id : rel?.org_id;
    if (!orgId) continue;
    docCountByOrg.set(orgId, (docCountByOrg.get(orgId) ?? 0) + 1);
  }

  const rows: AdminOrgListRow[] = filtered.map((o) => {
    const p = projectsByOrg.get(o.id);
    return {
      id: o.id,
      name: o.name,
      cnpj: o.cnpj,
      plano: o.plano as PlanId,
      created_at: o.created_at,
      member_count: memberCountByOrg.get(o.id) ?? 0,
      project_count: p?.count ?? 0,
      doc_count: docCountByOrg.get(o.id) ?? 0,
      is_suspended: Boolean(o.meta?.suspended_at),
      owner_email: ownerEmailByOrg.get(o.id) ?? null,
      last_activity: p?.lastActivity ?? null,
    };
  });

  return { rows, total: count ?? rows.length };
}

// ============================================
// Detail de uma organização
// ============================================

export type AdminOrgMember = {
  user_id: string;
  email: string | null;
  role: "owner" | "admin" | "member";
  accepted_at: string | null;
};

export type AdminOrgProject = {
  id: string;
  nome: string;
  status: string;
  tipologia: string;
  padrao_construtivo: string | null;
  valor_contrato: number | null;
  updated_at: string;
};

export type AdminOrgSubscription = {
  id: string;
  plano: PlanId;
  status: string;
  provider: string;
  current_period_start: string | null;
  current_period_end: string | null;
  created_at: string;
  meta: Record<string, unknown> | null;
};

export type AdminOrgAuditEntry = {
  id: number;
  action: string;
  actor_type: string;
  actor_id: string | null;
  entity_type: string;
  entity_id: string | null;
  created_at: string;
  payload: Record<string, unknown> | null;
};

export type AdminOrgDetail = {
  id: string;
  name: string;
  cnpj: string | null;
  plano: PlanId;
  plano_label: string;
  plano_price_cents: number | null;
  registro_cau: string | null;
  registro_crea: string | null;
  bdi_padrao: number | null;
  created_at: string;
  updated_at: string;
  meta: Record<string, unknown> | null;
  is_suspended: boolean;
  suspended_at: string | null;
  suspended_reason: string | null;
  members: AdminOrgMember[];
  projects: AdminOrgProject[];
  subscriptions: AdminOrgSubscription[];
  recent_audit: AdminOrgAuditEntry[];
  // KPIs
  member_count: number;
  project_count: number;
  doc_count_total: number;
  doc_count_this_month: number;
  client_count: number;
};

export async function loadAdminOrgDetail(orgId: string): Promise<AdminOrgDetail | null> {
  const supabase = createAdminClient();

  const { data: org } = await supabase
    .from("organizations")
    .select(
      "id, name, cnpj, plano, registro_cau, registro_crea, bdi_padrao, created_at, updated_at, meta",
    )
    .eq("id", orgId)
    .maybeSingle();

  if (!org) return null;
  const orgTyped = org as {
    id: string;
    name: string;
    cnpj: string | null;
    plano: string;
    registro_cau: string | null;
    registro_crea: string | null;
    bdi_padrao: number | null;
    created_at: string;
    updated_at: string;
    meta: Record<string, unknown> | null;
  };

  const monthStart = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1));

  const [membersRes, projectsRes, subsRes, docsAllRes, docsMonthRes, clientsRes, auditRes] =
    await Promise.all([
      supabase
        .from("organization_members")
        .select("user_id, role, accepted_at")
        .eq("org_id", orgId),
      supabase
        .from("projects")
        .select("id, nome, status, tipologia, padrao_construtivo, valor_contrato, updated_at")
        .eq("org_id", orgId)
        .order("updated_at", { ascending: false })
        .limit(50),
      supabase
        .from("subscriptions")
        .select(
          "id, plano, status, provider, current_period_start, current_period_end, created_at, meta",
        )
        .eq("org_id", orgId)
        .order("created_at", { ascending: false }),
      supabase
        .from("documents")
        .select("id, projects!inner(org_id)", { count: "exact", head: true })
        .eq("projects.org_id", orgId),
      supabase
        .from("documents")
        .select("id, projects!inner(org_id)", { count: "exact", head: true })
        .eq("projects.org_id", orgId)
        .gte("created_at", monthStart.toISOString()),
      supabase.from("clients").select("id", { count: "exact", head: true }).eq("org_id", orgId),
      supabase
        .from("audit_log")
        .select("id, action, actor_type, actor_id, entity_type, entity_id, created_at, payload")
        .eq("org_id", orgId)
        .order("created_at", { ascending: false })
        .limit(30),
    ]);

  const membersRaw = (membersRes.data ?? []) as {
    user_id: string;
    role: "owner" | "admin" | "member";
    accepted_at: string | null;
  }[];

  const members: AdminOrgMember[] = [];
  for (const m of membersRaw) {
    let email: string | null = null;
    try {
      const { data } = await supabase.auth.admin.getUserById(m.user_id);
      email = data.user?.email ?? null;
    } catch {
      email = null;
    }
    members.push({ user_id: m.user_id, email, role: m.role, accepted_at: m.accepted_at });
  }
  // Owners primeiro
  members.sort((a, b) => {
    const order = { owner: 0, admin: 1, member: 2 };
    return order[a.role] - order[b.role];
  });

  const planInfo = PLANS[orgTyped.plano as PlanId];

  return {
    id: orgTyped.id,
    name: orgTyped.name,
    cnpj: orgTyped.cnpj,
    plano: orgTyped.plano as PlanId,
    plano_label: planInfo?.label ?? orgTyped.plano,
    plano_price_cents: planInfo?.priceCents ?? null,
    registro_cau: orgTyped.registro_cau,
    registro_crea: orgTyped.registro_crea,
    bdi_padrao: orgTyped.bdi_padrao,
    created_at: orgTyped.created_at,
    updated_at: orgTyped.updated_at,
    meta: orgTyped.meta,
    is_suspended: Boolean(orgTyped.meta?.suspended_at),
    suspended_at: (orgTyped.meta?.suspended_at as string | undefined) ?? null,
    suspended_reason: (orgTyped.meta?.suspended_reason as string | undefined) ?? null,
    members,
    projects: (projectsRes.data ?? []) as AdminOrgProject[],
    subscriptions: (subsRes.data ?? []) as AdminOrgSubscription[],
    recent_audit: (auditRes.data ?? []) as AdminOrgAuditEntry[],
    member_count: membersRaw.length,
    project_count: projectsRes.data?.length ?? 0,
    doc_count_total: docsAllRes.count ?? 0,
    doc_count_this_month: docsMonthRes.count ?? 0,
    client_count: clientsRes.count ?? 0,
  };
}
