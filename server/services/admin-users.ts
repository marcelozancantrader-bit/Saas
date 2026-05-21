import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { PLANS, type PlanId } from "@/lib/plans/limits";

export type AdminUserListRow = {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  email_confirmed_at: string | null;
  provider: string;
  org_count: number;
  is_platform_admin: boolean;
  primary_org_name: string | null;
  primary_org_plan: PlanId | null;
  primary_role: "owner" | "admin" | "member" | null;
};

export type AdminUserListResult = {
  rows: AdminUserListRow[];
  total: number;
};

export type AdminUserOrgMembership = {
  org_id: string;
  org_name: string;
  org_plano: PlanId;
  role: "owner" | "admin" | "member";
  accepted_at: string | null;
  is_suspended: boolean;
};

export type AdminUserAuditEntry = {
  id: number;
  action: string;
  actor_type: string;
  entity_type: string;
  entity_id: string | null;
  created_at: string;
  org_id: string | null;
};

export type AdminUserDetail = {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  email_confirmed_at: string | null;
  provider: string;
  is_platform_admin: boolean;
  is_banned: boolean;
  banned_until: string | null;
  memberships: AdminUserOrgMembership[];
  recent_audit: AdminUserAuditEntry[];
};

const PAGE_SIZE = 50;

/**
 * Lista paginada de auth.users com agregados de membership.
 * Filtro `q` é aplicado client-side por limitação da admin API.
 */
export async function loadAdminUserList(opts: {
  q?: string;
  onlyAdmins?: boolean;
  page?: number;
}): Promise<AdminUserListResult> {
  const supabase = createAdminClient();
  const page = opts.page ?? 1;

  // 1. Lista usuarios do auth (paginado)
  const { data: authData } = await supabase.auth.admin.listUsers({
    page,
    perPage: PAGE_SIZE,
  });
  const users = authData?.users ?? [];

  // 2. Membership agregada + platform_admins flag
  const userIds = users.map((u) => u.id);
  if (userIds.length === 0) {
    return { rows: [], total: 0 };
  }

  const [membershipsRes, platformAdminsRes, orgsRes] = await Promise.all([
    supabase.from("organization_members").select("user_id, org_id, role").in("user_id", userIds),
    supabase.from("platform_admins").select("user_id").in("user_id", userIds),
    supabase.from("organizations").select("id, name, plano"),
  ]);

  const memberships = (membershipsRes.data ?? []) as {
    user_id: string;
    org_id: string;
    role: "owner" | "admin" | "member";
  }[];
  const platformAdminSet = new Set(
    (platformAdminsRes.data ?? []).map((p: { user_id: string }) => p.user_id),
  );
  const orgsMap = new Map<string, { name: string; plano: PlanId }>();
  for (const o of (orgsRes.data ?? []) as { id: string; name: string; plano: string }[]) {
    orgsMap.set(o.id, { name: o.name, plano: o.plano as PlanId });
  }

  const orgsByUser = new Map<
    string,
    {
      count: number;
      primaryName: string | null;
      primaryPlan: PlanId | null;
      primaryRole: "owner" | "admin" | "member" | null;
    }
  >();
  for (const m of memberships) {
    const cur = orgsByUser.get(m.user_id) ?? {
      count: 0,
      primaryName: null,
      primaryPlan: null,
      primaryRole: null,
    };
    cur.count += 1;
    // Owner > admin > member como "primary"
    const isMoreImportant =
      cur.primaryRole === null ||
      (m.role === "owner" && cur.primaryRole !== "owner") ||
      (m.role === "admin" && cur.primaryRole === "member");
    if (isMoreImportant) {
      const orgInfo = orgsMap.get(m.org_id);
      cur.primaryName = orgInfo?.name ?? null;
      cur.primaryPlan = orgInfo?.plano ?? null;
      cur.primaryRole = m.role;
    }
    orgsByUser.set(m.user_id, cur);
  }

  let rows: AdminUserListRow[] = users.map((u) => {
    const orgInfo = orgsByUser.get(u.id);
    return {
      id: u.id,
      email: u.email ?? "",
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at ?? null,
      email_confirmed_at: u.email_confirmed_at ?? null,
      provider: (u.app_metadata?.provider as string) ?? "email",
      org_count: orgInfo?.count ?? 0,
      is_platform_admin: platformAdminSet.has(u.id),
      primary_org_name: orgInfo?.primaryName ?? null,
      primary_org_plan: orgInfo?.primaryPlan ?? null,
      primary_role: orgInfo?.primaryRole ?? null,
    };
  });

  if (opts.q && opts.q.trim().length > 0) {
    const term = opts.q.trim().toLowerCase();
    rows = rows.filter(
      (r) =>
        r.email.toLowerCase().includes(term) || r.primary_org_name?.toLowerCase().includes(term),
    );
  }

  if (opts.onlyAdmins) {
    rows = rows.filter((r) => r.is_platform_admin);
  }

  const totalCount =
    authData && "total" in authData && typeof authData.total === "number"
      ? authData.total
      : rows.length;

  return {
    rows,
    total: totalCount,
  };
}

export async function loadAdminUserDetail(userId: string): Promise<AdminUserDetail | null> {
  const supabase = createAdminClient();

  const { data: userRes } = await supabase.auth.admin.getUserById(userId);
  if (!userRes?.user) return null;
  const u = userRes.user;

  const [membersRes, paRes, auditRes] = await Promise.all([
    supabase
      .from("organization_members")
      .select("org_id, role, accepted_at, organizations(id, name, plano, meta)")
      .eq("user_id", userId),
    supabase.from("platform_admins").select("user_id").eq("user_id", userId).maybeSingle(),
    supabase
      .from("audit_log")
      .select("id, action, actor_type, entity_type, entity_id, created_at, org_id")
      .eq("actor_id", userId)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  const memberships: AdminUserOrgMembership[] = (
    (membersRes.data ?? []) as unknown as {
      org_id: string;
      role: "owner" | "admin" | "member";
      accepted_at: string | null;
      organizations:
        | { id: string; name: string; plano: string; meta: Record<string, unknown> | null }
        | { id: string; name: string; plano: string; meta: Record<string, unknown> | null }[];
    }[]
  ).map((m) => {
    const rel = Array.isArray(m.organizations) ? m.organizations[0] : m.organizations;
    return {
      org_id: m.org_id,
      org_name: rel?.name ?? "(sem nome)",
      org_plano: (rel?.plano as PlanId) ?? "free",
      role: m.role,
      accepted_at: m.accepted_at,
      is_suspended: Boolean(rel?.meta?.suspended_at),
    };
  });

  // Owner primeiro
  memberships.sort((a, b) => {
    const order = { owner: 0, admin: 1, member: 2 };
    return order[a.role] - order[b.role];
  });

  const bannedUntil = (u as unknown as { banned_until?: string }).banned_until ?? null;

  return {
    id: u.id,
    email: u.email ?? "",
    created_at: u.created_at,
    last_sign_in_at: u.last_sign_in_at ?? null,
    email_confirmed_at: u.email_confirmed_at ?? null,
    provider: (u.app_metadata?.provider as string) ?? "email",
    is_platform_admin: !!paRes.data,
    is_banned: Boolean(bannedUntil && new Date(bannedUntil) > new Date()),
    banned_until: bannedUntil,
    memberships,
    recent_audit: (auditRes.data ?? []) as AdminUserAuditEntry[],
  };
}

// Re-export
export { PLANS };
