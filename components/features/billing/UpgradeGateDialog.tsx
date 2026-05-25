"use client";

import Link from "next/link";
import { Sparkles, CheckCircle2, ArrowRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PLANS, calculateCyclePrice, formatBrlFromCents } from "@/lib/plans/limits";
import { getFeatureLabel, getPlanLabel, type UpgradeRequirement } from "@/lib/billing/upgrade-gate";

type Props = {
  open: boolean;
  onClose: () => void;
  requirement: UpgradeRequirement | null;
};

/**
 * Modal disparado quando uma action retorna { ok:false, upgrade:{...} }.
 * Mostra plano necessário (preço, top features) e direciona pra /billing.
 *
 * Usado via hook `useUpgradeGate` — não monta state próprio.
 */
export function UpgradeGateDialog({ open, onClose, requirement }: Props) {
  if (!requirement) {
    return (
      <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
        <DialogContent />
      </Dialog>
    );
  }

  const plan = PLANS[requirement.requiredPlan];
  const monthly = calculateCyclePrice(requirement.requiredPlan, "monthly");
  const annual = calculateCyclePrice(requirement.requiredPlan, "annual");
  const planLabel = getPlanLabel(requirement.requiredPlan);
  const featureLabel = getFeatureLabel(requirement.feature);

  // Mostra primeiras 5 features do plano (geralmente as mais relevantes).
  const topFeatures = plan.features.slice(0, 5);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            Disponível no plano {planLabel}
          </DialogTitle>
          <DialogDescription>
            {featureLabel} faz parte do plano {planLabel}. Faça upgrade pra destravar essa e outras
            features.
          </DialogDescription>
        </DialogHeader>

        {requirement.limit ? (
          <div className="rounded-md border border-amber-200 bg-amber-50/60 px-3 py-2 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-100">
            Você está usando <strong>{requirement.limit.used}</strong> de{" "}
            <strong>{requirement.limit.limit}</strong> {requirement.limit.unit} do seu plano atual.
          </div>
        ) : null}

        <div className="rounded-lg border border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 p-4 dark:border-blue-900/40 dark:from-blue-950/30 dark:to-indigo-950/30">
          <div className="flex items-baseline justify-between gap-3">
            <div>
              <p className="text-sm font-semibold tracking-wide text-blue-900 uppercase dark:text-blue-200">
                Plano {planLabel}
              </p>
              <p className="mt-0.5 text-xs text-zinc-600 dark:text-zinc-400">{plan.description}</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
                {monthly ? formatBrlFromCents(monthly.effectiveMonthlyCents) : "Consultar"}
              </p>
              <p className="text-[11px] text-zinc-500">por mês</p>
              {annual && monthly && annual.effectiveMonthlyCents < monthly.effectiveMonthlyCents ? (
                <p className="mt-0.5 text-[11px] text-emerald-700 dark:text-emerald-400">
                  ou {formatBrlFromCents(annual.effectiveMonthlyCents)}/mês no anual
                </p>
              ) : null}
            </div>
          </div>

          <ul className="mt-4 grid gap-2 text-sm text-zinc-800 dark:text-zinc-200">
            {topFeatures.map((f) => (
              <li key={f} className="flex items-start gap-2">
                <CheckCircle2
                  className="mt-0.5 h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400"
                  aria-hidden
                />
                <span>{f}</span>
              </li>
            ))}
          </ul>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={onClose}>
            Agora não
          </Button>
          <Link href="/billing" className={cn(buttonVariants({ variant: "default" }))}>
            Ver planos
            <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
          </Link>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
