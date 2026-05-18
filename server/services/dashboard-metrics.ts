import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Sprint 7 — KPIs do dashboard.
 *
 * Tudo via admin client filtrando explicitamente por org_id (não precisamos
 * de RLS aqui porque getCurrentOrg() já garante que o usuário pertence à org).
 * Mantemos as queries pequenas e independentes pra simplificar.
 */

export type DashboardMetrics = {
  activeProjects: number;
  pendingDocuments: number; // status='aguardando_aprovacao'
  pendingScopeChanges: number; // status='pendente_analise' OR 'aguardando_cliente'
  approvedRevenueCents: number; // soma de valor_contrato dos projects com algum doc aprovado
  /** Tempo médio em dias entre projeto criado e primeiro doc aprovado pelo cliente. */
  avgCycleDays: number | null;
  staleProjects: number; // projects sem atualização há 14+ dias e status != concluido/arquivado
};

const STALE_DAYS = 14;

export async function getDashboardMetrics(orgId: string): Promise<DashboardMetrics> {
  const admin = createAdminClient();
  const staleThreshold = new Date();
  staleThreshold.setUTCDate(staleThreshold.getUTCDate() - STALE_DAYS);

  const [active, pendingDocs, pendingSc, projectsForRevenue, cycleSample, stale] =
    await Promise.all([
      admin
        .from("projects")
        .select("id", { count: "exact", head: true })
        .eq("org_id", orgId)
        .neq("status", "arquivado"),
      admin
        .from("documents")
        .select("id, projects!inner(org_id)", { count: "exact", head: true })
        .eq("projects.org_id", orgId)
        .eq("status", "aguardando_aprovacao"),
      admin
        .from("scope_changes")
        .select("id, projects!inner(org_id)", { count: "exact", head: true })
        .eq("projects.org_id", orgId)
        .in("status", ["pendente_analise", "aguardando_cliente"]),
      admin
        .from("projects")
        .select("id, valor_contrato, documents!inner(status)")
        .eq("org_id", orgId)
        .eq("documents.status", "aprovado"),
      admin
        .from("projects")
        .select("id, created_at, documents(aprovado_em)")
        .eq("org_id", orgId)
        .order("created_at", { ascending: false })
        .limit(30),
      admin
        .from("projects")
        .select("id", { count: "exact", head: true })
        .eq("org_id", orgId)
        .not("status", "in", "(concluido,arquivado)")
        .lt("updated_at", staleThreshold.toISOString()),
    ]);

  // dedup projects with multiple aprovado docs
  const projectsWithApproved = new Set<string>();
  let approvedRevenueCents = 0;
  for (const row of projectsForRevenue.data ?? []) {
    const id = row.id as string;
    if (projectsWithApproved.has(id)) continue;
    projectsWithApproved.add(id);
    const v = (row.valor_contrato as number | null) ?? 0;
    approvedRevenueCents += Math.round(v * 100);
  }

  // Average cycle: project.created_at → MIN(documents.aprovado_em) for that project
  const cycles: number[] = [];
  for (const p of cycleSample.data ?? []) {
    const docs = (p.documents ?? []) as Array<{ aprovado_em: string | null }>;
    const firstApproved = docs
      .map((d) => d.aprovado_em)
      .filter((s): s is string => !!s)
      .sort()[0];
    if (firstApproved && p.created_at) {
      const days =
        (new Date(firstApproved).getTime() - new Date(p.created_at as string).getTime()) /
        (1000 * 60 * 60 * 24);
      if (days >= 0) cycles.push(days);
    }
  }
  const avgCycleDays =
    cycles.length === 0 ? null : cycles.reduce((a, b) => a + b, 0) / cycles.length;

  return {
    activeProjects: active.count ?? 0,
    pendingDocuments: pendingDocs.count ?? 0,
    pendingScopeChanges: pendingSc.count ?? 0,
    approvedRevenueCents,
    avgCycleDays,
    staleProjects: stale.count ?? 0,
  };
}
