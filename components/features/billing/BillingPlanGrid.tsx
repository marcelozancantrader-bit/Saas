"use client";

import { useState } from "react";
import { Sparkles, Check } from "lucide-react";
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
 * Grade de planos em /billing — cards equal-height, ribbons claros, CTA
 * sempre no bottom, toggle de ciclo proeminente.
 *
 * Estados visuais por card:
 *   - Atual: ring zinc-900 + badge "Seu plano" + botão desabilitado
 *   - Highlighted (Pro): ring blue + ribbon flutuante "Mais popular"
 *   - Free: card neutro
 *   - Outros: card neutro com border padrão
 */
export function BillingPlanGrid({ currentPlan }: Props) {
  const [cycle, setCycle] = useState<BillingCycle>("monthly");

  return (
    <div className="space-y-6">
      {/* Header: cycle toggle proeminente */}
      <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
            Escolha o ciclo de cobrança
          </p>
          <p className="text-xs text-zinc-500">{CYCLES[cycle].description}</p>
        </div>
        <div className="inline-flex rounded-lg border border-zinc-200 bg-white p-1 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
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
                    className={[
                      "ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold",
                      isActive
                        ? "bg-white/20"
                        : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400",
                    ].join(" ")}
                  >
                    −{info.discountPercent}%
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      {/* Grid 5 cards equal-height */}
      <div className="grid items-stretch gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {PLAN_ORDER.map((id) => (
          <PlanCard key={id} planId={id} isCurrent={id === currentPlan} cycle={cycle} />
        ))}
      </div>
    </div>
  );
}

function PlanCard({
  planId,
  isCurrent,
  cycle,
}: {
  planId: PlanId;
  isCurrent: boolean;
  cycle: BillingCycle;
}) {
  const plan = PLANS[planId];
  const cyclePrice = calculateCyclePrice(planId, cycle);
  const displayMonthlyCents = cyclePrice?.effectiveMonthlyCents ?? plan.priceCents;
  const totalCycleCents = cyclePrice?.totalCycleCents ?? null;
  const isHighlighted = plan.highlighted;
  const isFree = planId === "free";
  const isAgency = planId === "agency";

  const ringClass = isCurrent
    ? "ring-2 ring-zinc-900 dark:ring-zinc-100"
    : isHighlighted
      ? "ring-2 ring-blue-500 dark:ring-blue-500"
      : "border border-zinc-200 dark:border-zinc-800";

  return (
    <div
      className={[
        "relative flex flex-col rounded-xl bg-white p-5 transition-shadow hover:shadow-md dark:bg-zinc-900",
        ringClass,
      ].join(" ")}
    >
      {/* Ribbon flutuante: Atual prevalece sobre Mais popular */}
      {isCurrent ? (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-zinc-900 px-3 py-1 text-[10px] font-semibold tracking-wide text-white uppercase dark:bg-zinc-100 dark:text-zinc-900">
          Seu plano
        </span>
      ) : isHighlighted ? (
        <span className="absolute -top-3 left-1/2 inline-flex -translate-x-1/2 items-center gap-1 rounded-full bg-blue-600 px-3 py-1 text-[10px] font-semibold tracking-wide text-white uppercase">
          <Sparkles className="h-3 w-3" aria-hidden /> Mais popular
        </span>
      ) : null}

      {/* Cabeçalho */}
      <div className="space-y-1">
        <h3 className="text-base font-semibold tracking-tight">{plan.label}</h3>
        <p className="text-[11px] leading-snug text-zinc-500 dark:text-zinc-400">
          {plan.description}
        </p>
      </div>

      {/* Preço */}
      <div className="mt-4 space-y-0.5">
        <p className="flex items-baseline gap-1">
          <span className="text-3xl font-bold tracking-tight">
            {formatBrlFromCents(displayMonthlyCents)}
          </span>
          {displayMonthlyCents !== null && displayMonthlyCents > 0 ? (
            <span className="text-xs text-zinc-500">/mês</span>
          ) : null}
        </p>
        {cyclePrice && cycle !== "monthly" && totalCycleCents ? (
          <p className="text-[11px] text-zinc-500">
            {cycle === "pix_annual" ? "PIX à vista " : "Total anual "}
            {formatBrlFromCents(totalCycleCents)}
          </p>
        ) : isFree || isAgency ? null : (
          <p className="text-[11px] text-zinc-400">{cycle === "monthly" ? "Sem fidelidade" : ""}</p>
        )}
        {planId === "pro" && cycle === "monthly" ? (
          <p className="pt-1 text-[11px] font-medium text-blue-700 dark:text-blue-400">
            ✨ 7 dias grátis · sem cartão
          </p>
        ) : null}
      </div>

      {/* Divider */}
      <div className="my-4 border-t border-zinc-100 dark:border-zinc-800" />

      {/* Features */}
      <ul className="flex-1 space-y-2 text-xs text-zinc-700 dark:text-zinc-300">
        {plan.features.map((f) => (
          <li key={f} className="flex items-start gap-2">
            <Check
              className={[
                "mt-0.5 h-3.5 w-3.5 shrink-0",
                isHighlighted
                  ? "text-blue-600 dark:text-blue-400"
                  : "text-emerald-600 dark:text-emerald-400",
              ].join(" ")}
              aria-hidden
            />
            <span className="leading-snug">{f}</span>
          </li>
        ))}
      </ul>

      {/* CTA fixo no bottom */}
      <div className="mt-5 pt-2">
        {isCurrent ? (
          <div className="flex h-9 w-full items-center justify-center rounded-md border border-dashed border-zinc-300 text-xs font-medium text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
            Plano ativo
          </div>
        ) : (
          <PlanUpgradeButton targetPlan={planId} cycle={cycle} />
        )}
      </div>
    </div>
  );
}
