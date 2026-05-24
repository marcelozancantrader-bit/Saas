import { createClient } from "@/lib/supabase/server";

export type OnboardingStep = {
  id: "create_project" | "extract_plan" | "generate_doc" | "send_portal";
  done: boolean;
  count: number;
};

export type OnboardingProgress = {
  steps: OnboardingStep[];
  completed: boolean;
  dismissedAt: string | null;
  /** % de progresso (0-100) baseado em quantos passos foram concluídos. */
  percent: number;
  /** Quando o tour guiado overlay foi concluído (ou pulado). Null = nunca rodou. */
  tourCompletedAt: string | null;
};

/**
 * Calcula o progresso de onboarding da org: quantos dos 4 passos do MVP
 * o usuário já realizou pelo menos uma vez. Não mexe em nenhum dado;
 * apenas conta agregados.
 *
 * Passos:
 *  1. create_project — tem ao menos 1 linha em `projects`
 *  2. extract_plan   — tem ao menos 1 projeto com extração CONFIRMADA
 *                      (meta.extracao_planta.confirmada = true)
 *  3. generate_doc   — tem ao menos 1 linha em `documents`
 *  4. send_portal    — tem ao menos 1 documento enviado (envio_meta IS NOT NULL)
 */
export async function getOnboardingProgress(orgId: string): Promise<OnboardingProgress> {
  const supabase = await createClient();

  const [
    { count: projectsCount },
    { count: extractedCount },
    { count: docsCount },
    { count: sentCount },
    { data: orgRow },
  ] = await Promise.all([
    supabase.from("projects").select("id", { count: "exact", head: true }).eq("org_id", orgId),
    supabase
      .from("projects")
      .select("id", { count: "exact", head: true })
      .eq("org_id", orgId)
      .not("meta->extracao_planta->confirmada", "is", null),
    supabase
      .from("documents")
      .select("id, projects!inner(org_id)", { count: "exact", head: true })
      .eq("projects.org_id", orgId),
    supabase
      .from("documents")
      .select("id, projects!inner(org_id)", { count: "exact", head: true })
      .eq("projects.org_id", orgId)
      .not("envio_meta", "is", null),
    supabase
      .from("organizations")
      .select("meta")
      .eq("id", orgId)
      .single<{ meta: Record<string, unknown> | null }>(),
  ]);

  const steps: OnboardingStep[] = [
    {
      id: "create_project",
      done: (projectsCount ?? 0) > 0,
      count: projectsCount ?? 0,
    },
    {
      id: "extract_plan",
      done: (extractedCount ?? 0) > 0,
      count: extractedCount ?? 0,
    },
    {
      id: "generate_doc",
      done: (docsCount ?? 0) > 0,
      count: docsCount ?? 0,
    },
    {
      id: "send_portal",
      done: (sentCount ?? 0) > 0,
      count: sentCount ?? 0,
    },
  ];

  const doneCount = steps.filter((s) => s.done).length;
  const completed = doneCount === steps.length;
  const percent = Math.round((doneCount / steps.length) * 100);

  const onboardingMeta =
    (orgRow?.meta?.onboarding as
      | { dismissed_at?: string; tour_completed_at?: string }
      | undefined) ?? {};
  const dismissedAt = onboardingMeta.dismissed_at ?? null;
  const tourCompletedAt = onboardingMeta.tour_completed_at ?? null;

  return { steps, completed, dismissedAt, percent, tourCompletedAt };
}
