"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  PLANS,
  PLAN_ORDER,
  CYCLES,
  CYCLE_ORDER,
  calculateCyclePrice,
  formatBrlFromCents,
  type BillingCycle,
  type PlanId,
} from "@/lib/plans/limits";
import { PlanUpgradeButton } from "@/components/features/billing/PlanUpgradeButton";

type Props = {
  currentPlan: PlanId;
};

/**
 * Grade de planos em /billing com toggle mensal/anual/PIX.
 * Client component (depende de useState pra o ciclo).
 */
export function BillingPlanGrid({ currentPlan }: Props) {
  const [cycle, setCycle] = useState<BillingCycle>("monthly");
  const cycleInfo = CYCLES[cycle];

  return (
    <div className="space-y-4">
      {/* Toggle de ciclo */}
      <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Escolha o ciclo de cobrança e o plano que faz sentido pro seu volume.
        </p>
        <div className="inline-flex rounded-lg border border-zinc-200 bg-white p-1 dark:border-zinc-700 dark:bg-zinc-900">
          {CYCLE_ORDER.map((id) => {
            const isActive = id === cycle;
            const info = CYCLES[id];
            return (
              <button
                key={id}
                type="button"
                onClick={() => setCycle(id)}
                className={[
                  "rounded-md px-3 py-1.5 text-xs font-medium transition",
                  isActive
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800",
                ].join(" ")}
              >
                {info.label}
                {info.discountPercent > 0 ? (
                  <span
                    className={
                      isActive
                        ? "ml-1.5 rounded-full bg-white/20 px-1 text-[10px] font-bold"
                        : "ml-1.5 rounded-full bg-emerald-100 px-1 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                    }
                  >
                    −{info.discountPercent}%
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>
      <p className="text-xs text-zinc-500">{cycleInfo.description}</p>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {PLAN_ORDER.map((id) => {
          const plan = PLANS[id];
          const isCurrent = id === currentPlan;
          const cyclePrice = calculateCyclePrice(id, cycle);
          const displayMonthlyCents = cyclePrice?.effectiveMonthlyCents ?? plan.priceCents;
          const totalCycleCents = cyclePrice?.totalCycleCents ?? null;

          return (
            <Card key={id} className={isCurrent ? "ring-2 ring-zinc-900 dark:ring-zinc-100" : ""}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{plan.label}</CardTitle>
                  {isCurrent ? <Badge variant="default">Atual</Badge> : null}
                </div>
                <p className="text-sm">
                  <span className="text-xl font-semibold">
                    {formatBrlFromCents(displayMonthlyCents)}
                  </span>
                  {displayMonthlyCents !== null && displayMonthlyCents > 0 ? (
                    <span className="ml-1 text-xs text-zinc-500">/mês</span>
                  ) : null}
                </p>
                {cyclePrice && cycle !== "monthly" && totalCycleCents ? (
                  <p className="text-[11px] text-zinc-500">
                    {cycle === "pix_annual" ? "PIX único de " : "Cobrado anual "}
                    {formatBrlFromCents(totalCycleCents)}
                  </p>
                ) : null}
              </CardHeader>
              <CardContent className="space-y-3">
                <ul className="space-y-1 text-xs text-zinc-700 dark:text-zinc-300">
                  {plan.features.map((f) => (
                    <li key={f} className="flex gap-1.5">
                      <span aria-hidden>•</span>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                {!isCurrent ? <PlanUpgradeButton targetPlan={id} cycle={cycle} /> : null}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
