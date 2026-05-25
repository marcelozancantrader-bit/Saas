import "server-only";
import { unstable_cache } from "next/cache";
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
  /** Projetos criados por dia nos últimos 30 dias (do dia mais antigo ao mais recente). */
  createdPerDay30d: number[];
  createdLast30d: number;
};

const STALE_DAYS = 14;

async function _getDashboardMetricsUncached(orgId: string): Promise<DashboardMetrics> {
  const admin = createAdminClient();
  const staleThreshold = new Date();
  staleThreshold.setUTCDate(staleThreshold.getUTCDate() - STALE_DAYS);

  const since30 = new Date();
  since30.setUTCDate(since30.getUTCDate() - 29); // 30 dias incluindo hoje
  since30.setUTCHours(0, 0, 0, 0);

  const [active, pendingDocs, pendingSc, projectsForRevenue, cycleSample, stale, recentProjects] =
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
      admin
        .from("projects")
        .select("created_at")
        .eq("org_id", orgId)
        .gte("created_at", since30.toISOString()),
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

  // Sparkline: agrupa por dia (UTC) e completa zeros.
  const buckets: number[] = Array(30).fill(0);
  for (const row of recentProjects.data ?? []) {
    const ts = new Date(row.created_at as string);
    const idx = Math.floor((ts.getTime() - since30.getTime()) / (1000 * 60 * 60 * 24));
    if (idx >= 0 && idx < 30) buckets[idx] = (buckets[idx] ?? 0) + 1;
  }
  const createdLast30d = buckets.reduce((a, b) => a + b, 0);

  return {
    activeProjects: active.count ?? 0,
    pendingDocuments: pendingDocs.count ?? 0,
    pendingScopeChanges: pendingSc.count ?? 0,
    approvedRevenueCents,
    avgCycleDays,
    staleProjects: stale.count ?? 0,
    createdPerDay30d: buckets,
    createdLast30d,
  };
}

/**
 * 8 queries paralelas ao Supabase por chamada. Sem cache, cada page load do
 * dashboard custava 8 hits — virou 8 hits a cada 60s por org.
 *
 * Pra invalidar mais cedo (após criar projeto / aprovar doc), chame
 * `revalidateTag(\`org-metrics:\${orgId}\`)` na action correspondente.
 */
export const getDashboardMetrics = unstable_cache(
  _getDashboardMetricsUncached,
  ["dashboard-metrics"],
  { revalidate: 60, tags: ["dashboard-metrics"] },
);
