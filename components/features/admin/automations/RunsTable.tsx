"use client";

import { useState } from "react";
import { CheckCircle2, XCircle, ChevronDown, ChevronRight, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { AdminAutomationRun, RunStep } from "@/lib/automations/types";

export function RunsTable({ runs }: { runs: AdminAutomationRun[] }) {
  const [expanded, setExpanded] = useState<string | null>(null);

  if (runs.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-zinc-300 p-12 text-center text-sm text-zinc-600 dark:border-zinc-700 dark:text-zinc-400">
        Nenhuma execução ainda. Quando o trigger disparar, as runs aparecem aqui.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800">
      {runs.map((run) => {
        const isExpanded = expanded === run.id;
        const duration =
          run.completed_at && run.started_at
            ? new Date(run.completed_at).getTime() - new Date(run.started_at).getTime()
            : null;
        const stepCount = Array.isArray(run.steps) ? run.steps.length : 0;
        return (
          <div
            key={run.id}
            className="border-b border-zinc-200 last:border-b-0 dark:border-zinc-800"
          >
            <button
              type="button"
              onClick={() => setExpanded(isExpanded ? null : run.id)}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition hover:bg-zinc-50 dark:hover:bg-zinc-900/50"
              aria-expanded={isExpanded}
            >
              {isExpanded ? (
                <ChevronDown className="h-3.5 w-3.5 text-zinc-500" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5 text-zinc-500" />
              )}
              <StatusBadge status={run.status} />
              <span className="flex-1 text-xs text-zinc-700 dark:text-zinc-300">
                {run.triggered_by}
              </span>
              <span className="text-xs text-zinc-500">{stepCount} steps</span>
              {duration !== null ? (
                <span className="flex items-center gap-1 text-xs text-zinc-500">
                  <Clock className="h-3 w-3" />
                  {duration}ms
                </span>
              ) : null}
              <span className="w-40 text-right text-xs text-zinc-500">
                {new Date(run.started_at).toLocaleString("pt-BR")}
              </span>
            </button>

            {isExpanded ? (
              <div className="space-y-2 border-t border-zinc-100 bg-zinc-50/40 px-4 py-3 dark:border-zinc-900 dark:bg-zinc-950/40">
                {run.trigger_payload ? (
                  <div>
                    <p className="text-[10px] font-semibold tracking-wider text-zinc-500 uppercase">
                      Payload do trigger
                    </p>
                    <pre className="mt-1 overflow-x-auto rounded border border-zinc-200 bg-white p-2 text-[10px] dark:border-zinc-800 dark:bg-zinc-900">
                      {JSON.stringify(run.trigger_payload, null, 2)}
                    </pre>
                  </div>
                ) : null}
                <div>
                  <p className="text-[10px] font-semibold tracking-wider text-zinc-500 uppercase">
                    Steps
                  </p>
                  <div className="mt-1 space-y-1.5">
                    {(run.steps as RunStep[]).map((s, i) => (
                      <StepCard key={`${run.id}-${i}`} step={s} />
                    ))}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "success") {
    return (
      <Badge
        variant="outline"
        className="gap-1 border-emerald-300 text-emerald-700 dark:border-emerald-900/40 dark:text-emerald-300"
      >
        <CheckCircle2 className="h-3 w-3" />
        Sucesso
      </Badge>
    );
  }
  if (status === "failed") {
    return (
      <Badge
        variant="outline"
        className="gap-1 border-rose-300 text-rose-700 dark:border-rose-900/40 dark:text-rose-300"
      >
        <XCircle className="h-3 w-3" />
        Falha
      </Badge>
    );
  }
  if (status === "running") {
    return (
      <Badge
        variant="outline"
        className="gap-1 border-blue-300 text-blue-700 dark:border-blue-900/40 dark:text-blue-300"
      >
        <Clock className="h-3 w-3 animate-pulse" />
        Rodando
      </Badge>
    );
  }
  return <Badge variant="outline">{status}</Badge>;
}

function StepCard({ step }: { step: RunStep }) {
  const isOk = step.status === "success";
  return (
    <div
      className={`rounded border px-2 py-1.5 text-xs ${
        isOk
          ? "border-emerald-200 bg-emerald-50/40 dark:border-emerald-900/40 dark:bg-emerald-950/20"
          : "border-rose-200 bg-rose-50/40 dark:border-rose-900/40 dark:bg-rose-950/20"
      }`}
    >
      <div className="flex items-center gap-1.5">
        {isOk ? (
          <CheckCircle2 className="h-3 w-3 text-emerald-600" />
        ) : (
          <XCircle className="h-3 w-3 text-rose-600" />
        )}
        <span className="font-mono text-[11px]">{step.action_type}</span>
        <span className="ml-auto text-[10px] text-zinc-500">{step.duration_ms}ms</span>
      </div>
      {step.error ? (
        <p className="mt-0.5 text-[11px] text-rose-700 dark:text-rose-400">{step.error}</p>
      ) : null}
      {step.output !== undefined && step.output !== null ? (
        <pre className="mt-1 overflow-x-auto text-[10px] text-zinc-600 dark:text-zinc-400">
          {JSON.stringify(step.output, null, 2)}
        </pre>
      ) : null}
    </div>
  );
}
