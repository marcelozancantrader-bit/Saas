import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrg } from "@/server/services/current-org";
import { getPlanUsage } from "@/server/services/plan-usage";
import { PLANS, formatBrlFromCents, type PlanId } from "@/lib/plans/limits";
import { CancelPlanButton } from "@/components/features/billing/CancelPlanButton";
import { StartTrialCard } from "@/components/features/billing/StartTrialCard";
import { BillingPlanGrid } from "@/components/features/billing/BillingPlanGrid";
import { resolveTrialState, TRIAL_PLAN, canStartTrial } from "@/lib/billing/trial";

export const dynamic = "force-dynamic";

export default async function BillingPage() {
  const org = await getCurrentOrg();
  const supabase = await createClient();

  const { data: orgRow } = await supabase
    .from("organizations")
    .select("plano, trial_started_at")
    .eq("id", org.orgId)
    .single<{ plano: PlanId; trial_started_at: string | null }>();
  const currentPlan = orgRow?.plano ?? "free";
  const usage = await getPlanUsage(org.orgId, currentPlan);

  const { data: subscriptions } = await supabase
    .from("subscriptions")
    .select(
      "id, plano, status, provider, current_period_start, current_period_end, cancel_at_period_end, created_at",
    )
    .eq("org_id", org.orgId)
    .order("created_at", { ascending: false })
    .limit(10);

  const trialingSub =
    subscriptions?.find((s) => s.status === "trialing" && s.provider === "trial") ?? null;
  const trialState = resolveTrialState({
    trialStartedAt: orgRow?.trial_started_at ?? null,
    trialingSub: trialingSub
      ? { current_period_end: trialingSub.current_period_end as string | null }
      : null,
    currentPlano: currentPlan,
  });

  const activeSub = subscriptions?.find((s) => s.status === "active") ?? null;
  const canCancel = currentPlan !== "free" && activeSub && !activeSub.cancel_at_period_end;
  const cancelScheduled = activeSub?.cancel_at_period_end === true;
  const showStartTrial = canStartTrial(trialState, currentPlan);
  const trialActive = trialState.kind === "active";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Plano e cobrança</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Gerencie o plano da sua organização ({org.orgName}).
        </p>
      </div>

      {showStartTrial ? <StartTrialCard /> : null}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Plano atual</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-3xl font-semibold">{PLANS[currentPlan].label}</p>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                {PLANS[currentPlan].description}
              </p>
            </div>
            <p className="text-right text-sm">
              <span className="text-2xl font-semibold">
                {formatBrlFromCents(PLANS[currentPlan].priceCents)}
              </span>
              {PLANS[currentPlan].priceCents !== null && PLANS[currentPlan].priceCents! > 0 ? (
                <span className="ml-1 text-zinc-500">/mês</span>
              ) : null}
            </p>
          </div>

          {trialActive ? (
            <div className="flex items-start gap-2 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-900 dark:border-blue-900/40 dark:bg-blue-950/30 dark:text-blue-200">
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <div>
                <p className="font-medium">
                  Trial {PLANS[TRIAL_PLAN].label} — {trialState.daysRemaining}{" "}
                  {trialState.daysRemaining === 1 ? "dia" : "dias"} restantes
                </p>
                <p className="opacity-80">
                  Até {trialState.endsAt.toLocaleDateString("pt-BR")}. Assine antes pra manter o
                  acesso ininterrupto.
                </p>
              </div>
            </div>
          ) : null}

          {trialState.kind === "expired" && currentPlan === "free" ? (
            <div className="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
              Você já utilizou o trial. Para destravar tudo do {PLANS[TRIAL_PLAN].label}, escolha um
              plano abaixo.
            </div>
          ) : null}

          {cancelScheduled && activeSub?.current_period_end ? (
            <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
              Cancelamento agendado. Acesso {PLANS[currentPlan].label} até{" "}
              {new Date(activeSub.current_period_end as string).toLocaleDateString("pt-BR")}.
              Depois, o workspace volta pro Free.
            </div>
          ) : null}

          {canCancel ? (
            <div className="flex justify-end">
              <CancelPlanButton
                endsAt={(activeSub.current_period_end as string | null) ?? null}
                planLabel={PLANS[currentPlan].label}
              />
            </div>
          ) : null}
        </CardContent>
      </Card>

      <BillingPlanGrid currentPlan={currentPlan} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Uso neste mês</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
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

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Histórico de assinaturas</CardTitle>
        </CardHeader>
        <CardContent>
          {!subscriptions || subscriptions.length === 0 ? (
            <p className="text-sm text-zinc-500">
              Nenhuma assinatura registrada ainda. Faça upgrade acima para começar.
            </p>
          ) : (
            <ul className="space-y-2 text-sm">
              {subscriptions.map((s) => {
                const isActive = s.status === "active";
                return (
                  <li
                    key={s.id}
                    className={
                      isActive
                        ? "flex items-start justify-between gap-3 rounded-md border border-emerald-200 bg-emerald-50/40 px-3 py-2 dark:border-emerald-900/40 dark:bg-emerald-950/20"
                        : "flex items-start justify-between gap-3 px-3 py-1.5"
                    }
                  >
                    <div>
                      <p className="font-medium">
                        {PLANS[s.plano as PlanId]?.label ?? s.plano}{" "}
                        <span className="text-xs text-zinc-500">· {s.provider}</span>
                      </p>
                      <p className="text-xs text-zinc-500">
                        Início {new Date(s.created_at as string).toLocaleDateString("pt-BR")}
                        {s.current_period_end
                          ? ` · até ${new Date(s.current_period_end as string).toLocaleDateString("pt-BR")}`
                          : null}
                        {s.cancel_at_period_end ? " · cancelamento agendado" : null}
                      </p>
                    </div>
                    <SubscriptionStatusBadge
                      status={s.status}
                      canceling={!!s.cancel_at_period_end}
                    />
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

const STATUS_LABEL: Record<string, string> = {
  active: "Ativa",
  trialing: "Em trial",
  past_due: "Pagamento atrasado",
  canceled: "Cancelada",
  incomplete: "Pagamento pendente",
  paused: "Pausada",
};

function SubscriptionStatusBadge({ status, canceling }: { status: string; canceling: boolean }) {
  const label =
    status === "active" && canceling ? "Ativa (cancelando)" : (STATUS_LABEL[status] ?? status);

  if (status === "active") {
    return (
      <Badge
        className={
          canceling
            ? "border-amber-300 bg-amber-100 text-amber-900 hover:bg-amber-100 dark:border-amber-900/40 dark:bg-amber-950/40 dark:text-amber-200"
            : "border-emerald-300 bg-emerald-100 text-emerald-900 hover:bg-emerald-100 dark:border-emerald-900/40 dark:bg-emerald-950/40 dark:text-emerald-200"
        }
      >
        {label}
      </Badge>
    );
  }
  if (status === "past_due") {
    return (
      <Badge className="border-rose-300 bg-rose-100 text-rose-900 hover:bg-rose-100 dark:border-rose-900/40 dark:bg-rose-950/40 dark:text-rose-200">
        {label}
      </Badge>
    );
  }
  return <Badge variant="outline">{label}</Badge>;
}

function UsageStat({ label, used, limit }: { label: string; used: number; limit: number | null }) {
  return (
    <div>
      <p className="text-xs tracking-wider text-zinc-500 uppercase">{label}</p>
      <p className="mt-1 text-2xl font-semibold">
        {used}
        <span className="ml-1 text-sm text-zinc-500">
          {limit === null ? "· sem limite" : `/ ${limit}`}
        </span>
      </p>
    </div>
  );
}
