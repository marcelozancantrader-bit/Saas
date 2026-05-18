import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Sprint 8 — LGPD: export completo dos dados do usuário (Lei 13.709/2018,
 * art. 18, II — "acesso aos dados").
 *
 * Cobre TODAS as tabelas que armazenam dados do usuário ou de seus clientes,
 * via org_id. Não inclui auth.users (gerenciado pelo Supabase Auth).
 *
 * Retorna um objeto JSON serializável. O endpoint /api/lgpd/export embrulha
 * isso num download attachment.
 */

export type LgpdExportResult = {
  ok: true;
  exported_at: string;
  user: { id: string; email: string };
  orgs: Array<{
    organization: Record<string, unknown>;
    members: unknown[];
    clients: unknown[];
    projects: unknown[];
    project_files: unknown[];
    documents: unknown[];
    scope_changes: unknown[];
    budgets: unknown[];
    subscriptions: unknown[];
    notifications: unknown[];
    audit_log_recent: unknown[];
  }>;
};

export async function exportUserDataAsJson(
  userId: string,
  userEmail: string,
): Promise<LgpdExportResult> {
  const admin = createAdminClient();

  const { data: memberships } = await admin
    .from("organization_members")
    .select("org_id")
    .eq("user_id", userId);

  const orgIds = (memberships ?? []).map((m) => m.org_id as string);

  const orgs: LgpdExportResult["orgs"] = [];

  for (const orgId of orgIds) {
    const [
      organization,
      members,
      clients,
      projects,
      projectFiles,
      documents,
      scopeChanges,
      budgets,
      subscriptions,
      notifications,
      audit,
    ] = await Promise.all([
      admin.from("organizations").select("*").eq("id", orgId).single(),
      admin.from("organization_members").select("*").eq("org_id", orgId),
      admin.from("clients").select("*").eq("org_id", orgId),
      admin.from("projects").select("*").eq("org_id", orgId),
      admin.from("project_files").select("*, projects!inner(org_id)").eq("projects.org_id", orgId),
      admin.from("documents").select("*, projects!inner(org_id)").eq("projects.org_id", orgId),
      admin.from("scope_changes").select("*, projects!inner(org_id)").eq("projects.org_id", orgId),
      admin.from("budgets").select("*, projects!inner(org_id)").eq("projects.org_id", orgId),
      admin.from("subscriptions").select("*").eq("org_id", orgId),
      admin.from("notifications").select("*").eq("org_id", orgId),
      admin
        .from("audit_log")
        .select("*")
        .eq("org_id", orgId)
        .order("created_at", { ascending: false })
        .limit(500),
    ]);

    orgs.push({
      organization: (organization.data ?? {}) as Record<string, unknown>,
      members: members.data ?? [],
      clients: clients.data ?? [],
      projects: projects.data ?? [],
      project_files: projectFiles.data ?? [],
      documents: documents.data ?? [],
      scope_changes: scopeChanges.data ?? [],
      budgets: budgets.data ?? [],
      subscriptions: subscriptions.data ?? [],
      notifications: notifications.data ?? [],
      audit_log_recent: audit.data ?? [],
    });
  }

  return {
    ok: true,
    exported_at: new Date().toISOString(),
    user: { id: userId, email: userEmail },
    orgs,
  };
}
