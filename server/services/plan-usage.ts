import "server-only";
import { unstable_cache } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  checkActiveProjectLimit,
  checkAiDocLimit,
  getPlanLimits,
  type PlanId,
  type PlanLimitCheck,
} from "@/lib/plans/limits";

/**
 * Sprint 7 — uso atual da org no mês corrente vs. os limites do plano.
 *
 * Não cacheia: as queries são baratas (counts indexados em projects.org_id
 * e documents.project_id) e RSCs já são cache por request via React.
 */

export type PlanUsage = {
  planId: PlanId;
  activeProjects: { used: number; limit: number | null };
  monthlyAiDocs: { used: number; limit: number | null };
  users: { used: number; limit: number | null };
};

function startOfMonthUtc(): string {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)).toISOString();
}

async function _getPlanUsageUncached(orgId: string, planId: PlanId): Promise<PlanUsage> {
  const admin = createAdminClient();
  const limits = getPlanLimits(planId);

  const [activeProjects, monthlyAiDocs, users] = await Promise.all([
    admin
      .from("projects")
      .select("id", { count: "exact", head: true })
      .eq("org_id", orgId)
      .neq("status", "arquivado"),
    admin
      .from("documents")
      .select("id, projects!inner(org_id)", { count: "exact", head: true })
      .eq("projects.org_id", orgId)
      .not("prompt_versao", "is", null)
      .gte("created_at", startOfMonthUtc()),
    admin
      .from("organization_members")
      .select("user_id", { count: "exact", head: true })
      .eq("org_id", orgId),
  ]);

  return {
    planId,
    activeProjects: { used: activeProjects.count ?? 0, limit: limits.maxActiveProjects },
    monthlyAiDocs: { used: monthlyAiDocs.count ?? 0, limit: limits.monthlyAiDocs },
    users: { used: users.count ?? 0, limit: limits.maxUsers },
  };
}

/**
 * 3 queries paralelas por chamada. RSC do dashboard chama 2x (uma direto, outra
 * via canCreateActiveProject). Cache 60s reduz drasticamente o tráfego ao Postgres.
 *
 * Pra invalidar antes (após criar projeto, gerar doc, convidar membro), chame
 * `revalidateTag("plan-usage")` na action correspondente.
 */
export const getPlanUsage = unstable_cache(_getPlanUsageUncached, ["plan-usage"], {
  revalidate: 60,
  tags: ["plan-usage"],
});

/** Re-exporta com mesmas assinaturas pra não quebrar callers existentes. */
export type LimitCheck = PlanLimitCheck;

export function canCreateActiveProject(usage: PlanUsage): LimitCheck {
  return checkActiveProjectLimit(usage.activeProjects.used, usage.activeProjects.limit);
}

export function canGenerateAiDoc(usage: PlanUsage): LimitCheck {
  return checkAiDocLimit(usage.monthlyAiDocs.used, usage.monthlyAiDocs.limit);
}
