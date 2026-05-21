import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

export type AdminAuditRow = {
  id: number;
  org_id: string | null;
  org_name: string | null;
  actor_id: string | null;
  actor_email: string | null;
  actor_type: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  payload: Record<string, unknown> | null;
  ip: string | null;
  user_agent: string | null;
  created_at: string;
};

export type AuditFilters = {
  q?: string;
  action?: string;
  actor_type?: string;
  org_id?: string;
  from?: string; // YYYY-MM-DD
  to?: string;
  page?: number;
  pageSize?: number;
};

export async function loadAdminAuditLog(
  opts: AuditFilters,
): Promise<{ rows: AdminAuditRow[]; total: number; distinctActions: string[] }> {
  const supabase = createAdminClient();
  const page = opts.page ?? 1;
  const pageSize = opts.pageSize ?? 50;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let q = supabase
    .from("audit_log")
    .select(
      "id, org_id, actor_id, actor_type, action, entity_type, entity_id, payload, ip, user_agent, created_at",
      { count: "exact" },
    );

  if (opts.action && opts.action !== "all") q = q.eq("action", opts.action);
  if (opts.actor_type && opts.actor_type !== "all") q = q.eq("actor_type", opts.actor_type);
  if (opts.org_id) q = q.eq("org_id", opts.org_id);
  if (opts.from) q = q.gte("created_at", new Date(opts.from).toISOString());
  if (opts.to) {
    const end = new Date(opts.to);
    end.setUTCHours(23, 59, 59, 999);
    q = q.lte("created_at", end.toISOString());
  }
  if (opts.q) q = q.ilike("action", `%${opts.q}%`);

  q = q.order("created_at", { ascending: false }).range(from, to);

  const { data, count } = await q;
  type RawRow = Omit<AdminAuditRow, "org_name" | "actor_email">;
  const rawRows = (data ?? []) as RawRow[];

  if (rawRows.length === 0) {
    return { rows: [], total: count ?? 0, distinctActions: await loadDistinctActions() };
  }

  // Resolve org names
  const orgIds = Array.from(
    new Set(rawRows.map((r) => r.org_id).filter((id): id is string => !!id)),
  );
  const orgNameById = new Map<string, string>();
  if (orgIds.length > 0) {
    const { data: orgs } = await supabase.from("organizations").select("id, name").in("id", orgIds);
    for (const o of (orgs ?? []) as { id: string; name: string }[]) {
      orgNameById.set(o.id, o.name);
    }
  }

  // Resolve actor emails (parallel batch)
  const actorIds = Array.from(
    new Set(rawRows.map((r) => r.actor_id).filter((id): id is string => !!id)),
  );
  const actorEmailById = new Map<string, string | null>();
  await Promise.all(
    actorIds.slice(0, 50).map(async (id) => {
      try {
        const { data } = await supabase.auth.admin.getUserById(id);
        actorEmailById.set(id, data.user?.email ?? null);
      } catch {
        actorEmailById.set(id, null);
      }
    }),
  );

  const rows: AdminAuditRow[] = rawRows.map((r) => ({
    ...r,
    org_name: r.org_id ? (orgNameById.get(r.org_id) ?? null) : null,
    actor_email: r.actor_id ? (actorEmailById.get(r.actor_id) ?? null) : null,
  }));

  return { rows, total: count ?? rows.length, distinctActions: await loadDistinctActions() };
}

async function loadDistinctActions(): Promise<string[]> {
  const supabase = createAdminClient();
  // Limita aos últimos 500 — quase sempre cobre todos os tipos
  const { data } = await supabase
    .from("audit_log")
    .select("action")
    .order("created_at", { ascending: false })
    .limit(500);
  const set = new Set<string>();
  for (const r of (data ?? []) as { action: string }[]) {
    set.add(r.action);
  }
  return Array.from(set).sort();
}

export async function exportAuditCsv(opts: AuditFilters): Promise<string> {
  const { rows } = await loadAdminAuditLog({ ...opts, pageSize: 5000 });

  const header = [
    "id",
    "created_at",
    "actor_type",
    "actor_email",
    "action",
    "entity_type",
    "entity_id",
    "org_name",
    "ip",
    "user_agent",
    "payload",
  ];
  const escapeCsv = (v: unknown): string => {
    if (v === null || v === undefined) return "";
    const s = typeof v === "string" ? v : JSON.stringify(v);
    if (s.includes(",") || s.includes('"') || s.includes("\n")) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };

  const lines = [header.join(",")];
  for (const r of rows) {
    lines.push(
      [
        r.id,
        r.created_at,
        r.actor_type,
        r.actor_email,
        r.action,
        r.entity_type,
        r.entity_id,
        r.org_name,
        r.ip,
        r.user_agent,
        r.payload,
      ]
        .map(escapeCsv)
        .join(","),
    );
  }
  return lines.join("\n");
}
