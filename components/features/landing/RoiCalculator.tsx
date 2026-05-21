"use client";

import { useState, useMemo } from "react";
import { Calculator, TrendingUp } from "lucide-react";

const HOURS_SAVED_PER_PROJECT = 31; // 8h memorial + 7d→1m orçamento + docs técnicos + ART + portal
const STANDARD_PRICE_CENTS = 19990;
const PRO_PRICE_CENTS = 44990;
const PRO_MAX_PRICE_CENTS = 69990;

function formatBrl(cents: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function pickPlan(projectsPerMonth: number) {
  if (projectsPerMonth <= 1)
    return { id: "standard", label: "Standard", priceCents: STANDARD_PRICE_CENTS };
  if (projectsPerMonth <= 10) return { id: "pro", label: "Pro", priceCents: PRO_PRICE_CENTS };
  return { id: "pro_max", label: "Pro Max", priceCents: PRO_MAX_PRICE_CENTS };
}

export function RoiCalculator() {
  const [projectsPerMonth, setProjectsPerMonth] = useState(3);
  const [hourlyRate, setHourlyRate] = useState(80);

  const stats = useMemo(() => {
    const hoursSavedMonthly = projectsPerMonth * HOURS_SAVED_PER_PROJECT;
    const moneySavedMonthlyCents = hoursSavedMonthly * hourlyRate * 100;
    const plan = pickPlan(projectsPerMonth);
    const netMonthlyCents = moneySavedMonthlyCents - plan.priceCents;
    const roiPercent =
      plan.priceCents > 0 ? Math.round((netMonthlyCents / plan.priceCents) * 100) : 0;
    const paybackProjects = plan.priceCents / (HOURS_SAVED_PER_PROJECT * hourlyRate * 100);
    return {
      hoursSavedMonthly,
      moneySavedMonthlyCents,
      plan,
      netMonthlyCents,
      roiPercent,
      paybackProjects: Math.max(0.1, paybackProjects),
    };
  }, [projectsPerMonth, hourlyRate]);

  return (
    <div className="rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 via-white to-white p-6 sm:p-10 dark:border-blue-900/50 dark:from-blue-950/40 dark:via-zinc-950 dark:to-zinc-950">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="flex items-center gap-1.5 text-xs tracking-wider text-blue-700 uppercase dark:text-blue-400">
            <Calculator className="h-3.5 w-3.5" /> Calcule seu ROI
          </p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
            Quanto você economiza com o Memorial.ai
          </h2>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Ajuste os valores e veja em tempo real o ROI do seu plano ideal.
          </p>
        </div>
        <TrendingUp className="hidden h-10 w-10 shrink-0 text-blue-500 sm:block" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="space-y-5">
          <div>
            <div className="flex items-center justify-between">
              <label
                htmlFor="projects"
                className="text-sm font-medium text-zinc-800 dark:text-zinc-200"
              >
                Projetos por mês
              </label>
              <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                {projectsPerMonth}
              </span>
            </div>
            <input
              id="projects"
              type="range"
              min={1}
              max={20}
              value={projectsPerMonth}
              onChange={(e) => setProjectsPerMonth(Number(e.target.value))}
              className="mt-2 w-full accent-blue-600"
            />
            <div className="mt-1 flex justify-between text-[10px] text-zinc-500">
              <span>1</span>
              <span>10</span>
              <span>20+</span>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label
                htmlFor="hourly"
                className="text-sm font-medium text-zinc-800 dark:text-zinc-200"
              >
                Seu valor-hora (R$)
              </label>
              <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                R$ {hourlyRate}
              </span>
            </div>
            <input
              id="hourly"
              type="range"
              min={40}
              max={250}
              step={5}
              value={hourlyRate}
              onChange={(e) => setHourlyRate(Number(e.target.value))}
              className="mt-2 w-full accent-blue-600"
            />
            <div className="mt-1 flex justify-between text-[10px] text-zinc-500">
              <span>R$ 40</span>
              <span>R$ 145</span>
              <span>R$ 250</span>
            </div>
          </div>

          <p className="rounded-md bg-blue-50 p-3 text-xs leading-relaxed text-blue-900 dark:bg-blue-950/40 dark:text-blue-200">
            Base do cálculo: <strong>{HOURS_SAVED_PER_PROJECT}h economizadas por projeto</strong> em
            trabalho documental (memorial, orçamento, docs técnicos, ART/RRT, aprovação).
          </p>
        </div>

        <div className="space-y-3">
          <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
            <p className="text-xs tracking-wide text-zinc-500 uppercase">Economia mensal</p>
            <p className="mt-1 text-3xl font-bold text-emerald-600 dark:text-emerald-400">
              {formatBrl(stats.moneySavedMonthlyCents)}
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              {stats.hoursSavedMonthly}h × R$ {hourlyRate}/h
            </p>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
              <p className="text-xs text-zinc-500">Plano sugerido</p>
              <p className="mt-1 text-lg font-bold text-blue-600 dark:text-blue-400">
                {stats.plan.label}
              </p>
              <p className="text-xs text-zinc-500">{formatBrl(stats.plan.priceCents)}/mês</p>
            </div>
            <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
              <p className="text-xs text-zinc-500">ROI mensal</p>
              <p className="mt-1 text-lg font-bold text-emerald-600 dark:text-emerald-400">
                {stats.roiPercent.toLocaleString("pt-BR")}%
              </p>
              <p className="text-xs text-zinc-500">Líquido vs plano</p>
            </div>
          </div>

          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900/50 dark:bg-emerald-950/30">
            <p className="text-xs tracking-wide text-emerald-700 uppercase dark:text-emerald-300">
              Payback
            </p>
            <p className="mt-1 text-sm font-medium text-emerald-900 dark:text-emerald-200">
              Plano se paga em{" "}
              <strong>
                {stats.paybackProjects < 1
                  ? "menos de 1 projeto"
                  : `${stats.paybackProjects.toFixed(1)} projeto${stats.paybackProjects > 1.5 ? "s" : ""}`}
              </strong>
              .
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
