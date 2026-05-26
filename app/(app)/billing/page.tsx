import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrg } from "@/server/services/current-org";
import { getPlanUsage } from "@/server/services/plan-usage";
import { PLANS, formatBrlFromCents, type PlanId } from "@/lib/plans/limits";
import { CancelPlanButton } from "@/components/features/billing/CancelPlanButton";
import { CancelTrialButton } from "@/components/features/billing/CancelTrialButton";
import { StartTrialCard } from "@/components/features/billing/StartTrialCard";
import { BillingPlanGrid } from "@/components/features/billing/BillingPlanGrid";
import {
  SubscriptionHistory,
  type SubscriptionRow,
} from "@/components/features/billing/SubscriptionHistory";
import { PlanComparisonTable } from "@/components/features/billing/PlanComparisonTable";
import { resolveTrialState, TRIAL_PLAN, canStartTrial } from "@/lib/billing/trial";
import { getGrandfatheringStatus, formatGrandfatheringDate } from "@/lib/plans/grandfathering";

export const dynamic = "force-dynamic";

export default async function BillingPage() {
  const org = await getCurrentOrg();
  const supabase = await createClient();

  const { data: orgRow } = await supabase
    .from("organizations")
    .select("plano, trial_started_at, meta")
    .eq("id", org.orgId)
    .single<{
      plano: PlanId;
      trial_started_at: string | null;
      meta: { grandfathered_until?: string | null; legacy_price_cents?: number | null } | null;
    }>();
  const currentPlan = orgRow?.plano ?? "free";
  const grandfathering = getGrandfatheringStatus(orgRow?.meta);
  const usage = await getPlanUsage(org.orgId, currentPlan);

  const { data: subscriptionsRaw } = await supabase
    .from("subscriptions")
    .select(
      "id, plano, status, provider, current_period_start, current_period_end, cancel_at_period_end, created_at",
    )
    .eq("org_id", org.orgId)
    .order("created_at", { ascending: false })
    .limit(50);
  const subscriptions: SubscriptionRow[] = (subscriptionsRaw ?? []) as SubscriptionRow[];

  const trialingSub =
    subscriptions.find((s) => s.status === "trialing" && s.provider === "trial") ?? null;
  const trialState = resolveTrialState({
    trialStartedAt: orgRow?.trial_started_at ?? null,
    trialingSub: trialingSub
      ? { current_period_end: trialingSub.current_period_end as string | null }
      : null,
    currentPlano: currentPlan,
  });

  const activeSub = subscriptions.find((s) => s.status === "active") ?? null;
  const canCancel = currentPlan !== "free" && activeSub && !activeSub.cancel_at_period_end;
  const cancelScheduled = activeSub?.cancel_at_period_end === true;
  const showStartTrial = canStartTrial(trialState, currentPlan);
  const trialActive = trialState.kind === "active";
  const currentPlanInfo = PLANS[currentPlan];

  return (
    <div className="space-y-8">
      {/* Header compacto */}
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Plano e cobrança</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Workspace <span className="font-medium">{org.orgName}</span> · plano atual{" "}
          <span className="rounded-md bg-zinc-100 px-1.5 py-0.5 font-medium text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100">
            {currentPlanInfo.label}
          </span>
          {currentPlanInfo.priceCents !== null && currentPlanInfo.priceCents > 0 ? (
            <>
              {" · "}
              {formatBrlFromCents(currentPlanInfo.priceCents)}/mês
            </>
          ) : currentPlanInfo.priceCents === 0 ? (
            " · Grátis"
          ) : null}
        </p>
      </div>

      {/* Banners de estado */}
      {grandfathering.isGrandfathered && grandfathering.until ? (
        <div className="rounded-lg border border-emerald-300 bg-emerald-50/60 p-4 text-sm dark:border-emerald-900/40 dark:bg-emerald-950/20">
          <p className="font-medium text-emerald-900 dark:text-emerald-100">
            🔒 Preço congelado por mais {grandfathering.daysLeft} dias
          </p>
          <p className="mt-1 text-xs text-emerald-800 dark:text-emerald-200">
            Você está em um plano legado — o valor cobrado pelo Asaas continua o mesmo até{" "}
            <strong>{formatGrandfatheringDate(grandfathering.until)}</strong>. Após essa data,
            migramos pra grade nova com aviso prévio.
          </p>
        </div>
      ) : null}
      {showStartTrial ? <StartTrialCard /> : null}

      {trialActive ? (
        <div className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900 dark:border-blue-900/40 dark:bg-blue-950/30 dark:text-blue-200">
          <Sparkles className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <div className="flex-1">
            <p className="font-medium">
              Trial {PLANS[TRIAL_PLAN].label} ativo — {trialState.daysRemaining}{" "}
              {trialState.daysRemaining === 1 ? "dia restante" : "dias restantes"}
            </p>
            <p className="text-xs opacity-80">
              Acaba em {trialState.endsAt.toLocaleDateString("pt-BR")}. Assine antes pra manter
              acesso ininterrupto.
            </p>
          </div>
          <CancelTrialButton daysRemaining={trialState.daysRemaining} />
        </div>
      ) : null}

      {trialState.kind === "expired" && currentPlan === "free" ? (
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
          Você já utilizou o trial. Pra destravar tudo do {PLANS[TRIAL_PLAN].label}, escolha um
          plano abaixo.
        </div>
      ) : null}

      {cancelScheduled && activeSub?.current_period_end ? (
        <div className="flex items-start justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
          <div>
            <p className="font-medium">Cancelamento agendado</p>
            <p className="text-xs opacity-80">
              Acesso {currentPlanInfo.label} até{" "}
              {new Date(activeSub.current_period_end as string).toLocaleDateString("pt-BR")}.
              Depois, o workspace volta pro Free.
            </p>
          </div>
        </div>
      ) : null}

      {/* Grid de planos */}
      <BillingPlanGrid currentPlan={currentPlan} />

      {/* Comparison table colapsível */}
      <PlanComparisonTable />

      {/* Uso + Cancelar lado a lado */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Uso neste mês</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-3">
            <UsageStat
              label="Projetos ativos"
              used={usage.activeProjects.used}
              limit={usage.activeProjects.limit}
            />
            <UsageStat
              label="Documentos IA"
              used={usage.monthlyAiDocs.used}
              limit={usage.monthlyAiDocs.limit}
            />
            <UsageStat label="Usuários" used={usage.users.used} limit={usage.users.limit} />
          </CardContent>
        </Card>

        {canCancel ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Cancelar plano</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p className="text-xs text-zinc-600 dark:text-zinc-400">
                Mantém acesso até o fim do período já pago. Depois volta pra Free.
              </p>
              <CancelPlanButton
                endsAt={(activeSub.current_period_end as string | null) ?? null}
                planLabel={currentPlanInfo.label}
              />
            </CardContent>
          </Card>
        ) : null}
      </div>

      {/* Histórico colapsível */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Histórico de assinaturas</CardTitle>
        </CardHeader>
        <CardContent>
          <SubscriptionHistory subscriptions={subscriptions} />
        </CardContent>
      </Card>
    </div>
  );
}

function UsageStat({ label, used, limit }: { label: string; used: number; limit: number | null }) {
  const pct = limit ? Math.min(100, (used / limit) * 100) : 0;
  const tone = !limit || pct < 70 ? "bg-emerald-500" : pct < 90 ? "bg-amber-500" : "bg-rose-500";

  return (
    <div className="space-y-1.5">
      <p className="text-[11px] tracking-wider text-zinc-500 uppercase">{label}</p>
      <p className="text-2xl font-semibold">
        {used}
        <span className="ml-1 text-xs font-normal text-zinc-500">
          {limit === null ? "· sem limite" : `/ ${limit}`}
        </span>
      </p>
      {limit !== null ? (
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
          <div className={`h-full ${tone} transition-all`} style={{ width: `${pct}%` }} />
        </div>
      ) : null}
    </div>
  );
}
