import Link from "next/link";
import { Sparkles, ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { resolveTrialState, TRIAL_PLAN } from "@/lib/billing/trial";
import { PLANS } from "@/lib/plans/limits";

/**
 * Banner global mostrado pra orgs em trial ativo. Tem 3 estágios visuais:
 *   - >= 3 dias restantes: estilo azul informativo.
 *   - 1-2 dias: âmbar (urgência).
 *   - 0 dias (expira hoje): vermelho leve.
 *
 * Renderizado em RSC dentro do (app)/layout — re-busca a cada navegação.
 * Pra orgs que não estão em trial, retorna null silencioso.
 */
export async function TrialBanner({ orgId, plano }: { orgId: string; plano: string }) {
  const supabase = await createClient();

  const [orgRes, subRes] = await Promise.all([
    supabase
      .from("organizations")
      .select("trial_started_at")
      .eq("id", orgId)
      .single<{ trial_started_at: string | null }>(),
    supabase
      .from("subscriptions")
      .select("current_period_end")
      .eq("org_id", orgId)
      .eq("status", "trialing")
      .eq("provider", "trial")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle<{ current_period_end: string | null }>(),
  ]);

  const trialStartedAt = orgRes.data?.trial_started_at ?? null;
  const trialingSub = subRes.data ?? null;
  const state = resolveTrialState({
    trialStartedAt,
    trialingSub,
    currentPlano: plano,
  });

  if (state.kind !== "active") return null;

  const { daysRemaining, endsAt } = state;
  const tone =
    daysRemaining >= 3
      ? "border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-900/40 dark:bg-blue-950/30 dark:text-blue-200"
      : daysRemaining >= 1
        ? "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200"
        : "border-rose-200 bg-rose-50 text-rose-900 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-200";

  const planLabel = PLANS[TRIAL_PLAN].label;
  const dayWord = daysRemaining === 1 ? "dia" : "dias";

  const headline =
    daysRemaining === 0
      ? `Seu trial ${planLabel} acaba hoje (${endsAt.toLocaleDateString("pt-BR")}).`
      : `Trial ${planLabel} ativo · ${daysRemaining} ${dayWord} restantes (até ${endsAt.toLocaleDateString("pt-BR")}).`;

  return (
    <div className="px-4 pt-3 md:px-8">
      <div
        role="status"
        className={`flex flex-col items-start justify-between gap-2 rounded-lg border px-3 py-2 text-sm sm:flex-row sm:items-center ${tone}`}
      >
        <div className="flex items-start gap-2 sm:items-center">
          <Sparkles className="mt-0.5 h-4 w-4 shrink-0 sm:mt-0" aria-hidden />
          <div>
            <p className="font-medium">{headline}</p>
            <p className="text-xs opacity-80">
              Quando acabar, o workspace volta pro Free automaticamente.
            </p>
          </div>
        </div>
        <Link
          href="/billing"
          className="inline-flex items-center gap-1 self-stretch rounded-md border border-current/30 bg-white/40 px-3 py-1.5 text-xs font-medium whitespace-nowrap transition hover:bg-white/70 sm:self-auto dark:bg-black/20 dark:hover:bg-black/40"
        >
          Manter {planLabel}
          <ArrowRight className="h-3 w-3" aria-hidden />
        </Link>
      </div>
    </div>
  );
}
