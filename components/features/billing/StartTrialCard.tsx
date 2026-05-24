import { Sparkles, CheckCircle2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { StartTrialButton } from "./StartTrialButton";
import { PLANS } from "@/lib/plans/limits";
import { TRIAL_PLAN, TRIAL_DAYS } from "@/lib/billing/trial";

/**
 * Card de chamada pra ação — mostrado em /billing pra orgs free que nunca
 * iniciaram trial. Destaca benefícios concretos e enfatiza "sem cartão".
 */
export function StartTrialCard() {
  const plan = PLANS[TRIAL_PLAN];

  return (
    <Card className="relative overflow-hidden border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 dark:border-blue-900/40 dark:from-blue-950/30 dark:to-indigo-950/30">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-12 -right-12 h-40 w-40 rounded-full bg-blue-200/40 blur-3xl dark:bg-blue-700/20"
      />
      <CardContent className="relative space-y-4 p-6">
        <div className="flex items-center gap-2 text-blue-900 dark:text-blue-200">
          <Sparkles className="h-5 w-5" aria-hidden />
          <p className="text-sm font-semibold tracking-wide uppercase">Trial grátis · sem cartão</p>
        </div>

        <div>
          <h2 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
            Experimente {plan.label} por {TRIAL_DAYS} dias
          </h2>
          <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-300">
            Desbloqueie tudo que diferencia o {plan.label} do Free. Quando acabar, o workspace volta
            sozinho — sem cobrança.
          </p>
        </div>

        <ul className="grid gap-2 text-sm text-zinc-800 sm:grid-cols-2 dark:text-zinc-200">
          {plan.features.slice(0, 6).map((f) => (
            <li key={f} className="flex items-start gap-2">
              <CheckCircle2
                className="mt-0.5 h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400"
                aria-hidden
              />
              <span>{f}</span>
            </li>
          ))}
        </ul>

        <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:items-center sm:justify-between">
          <StartTrialButton />
          <p className="text-xs text-zinc-600 dark:text-zinc-400">
            1 trial por workspace. Não precisamos do seu cartão.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
