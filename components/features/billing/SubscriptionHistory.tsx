"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PLANS, type PlanId } from "@/lib/plans/limits";

const STATUS_LABEL: Record<string, string> = {
  active: "Ativa",
  trialing: "Em trial",
  past_due: "Pagamento atrasado",
  canceled: "Cancelada",
  pending: "Pendente",
  incomplete: "Pagamento pendente",
  paused: "Pausada",
};

export type SubscriptionRow = {
  id: string;
  plano: string;
  status: string;
  provider: string;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  created_at: string;
};

type Props = {
  subscriptions: SubscriptionRow[];
};

/**
 * Histórico de assinaturas com:
 * - Active/pending/trialing/past_due no topo (sempre visíveis)
 * - Canceladas/incomplete agrupadas em "Ver N anteriores" colapsível
 * - Ordena por created_at desc dentro de cada grupo
 */
export function SubscriptionHistory({ subscriptions }: Props) {
  const [expanded, setExpanded] = useState(false);

  if (!subscriptions || subscriptions.length === 0) {
    return (
      <p className="text-sm text-zinc-500">
        Nenhuma assinatura registrada ainda. Faça upgrade acima para começar.
      </p>
    );
  }

  const currentStatuses = new Set(["active", "trialing", "past_due"]);
  const current = subscriptions.filter((s) => currentStatuses.has(s.status));
  const pending = subscriptions.filter((s) => s.status === "pending");
  const archived = subscriptions.filter(
    (s) => !currentStatuses.has(s.status) && s.status !== "pending",
  );

  return (
    <div className="space-y-3">
      {/* Atuais sempre visíveis */}
      {current.length > 0 ? (
        <ul className="space-y-2">
          {current.map((s) => (
            <SubscriptionRowItem key={s.id} sub={s} variant="active" />
          ))}
        </ul>
      ) : null}

      {/* Pending — aviso amarelo proeminente */}
      {pending.length > 0 ? (
        <div className="space-y-2">
          <p className="text-[11px] font-medium tracking-wide text-amber-700 uppercase dark:text-amber-400">
            Aguardando pagamento
          </p>
          <ul className="space-y-2">
            {pending.map((s) => (
              <SubscriptionRowItem key={s.id} sub={s} variant="pending" />
            ))}
          </ul>
        </div>
      ) : null}

      {/* Arquivadas — colapsível */}
      {archived.length > 0 ? (
        <div>
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="flex w-full items-center justify-between rounded-md border border-zinc-200 bg-zinc-50/50 px-3 py-2 text-xs font-medium text-zinc-600 transition hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-400 dark:hover:bg-zinc-800"
          >
            <span>
              {expanded ? "Ocultar" : "Ver"} {archived.length}{" "}
              {archived.length === 1 ? "assinatura anterior" : "assinaturas anteriores"}
            </span>
            {expanded ? (
              <ChevronUp className="h-4 w-4" aria-hidden />
            ) : (
              <ChevronDown className="h-4 w-4" aria-hidden />
            )}
          </button>
          {expanded ? (
            <ul className="mt-2 space-y-1">
              {archived.map((s) => (
                <SubscriptionRowItem key={s.id} sub={s} variant="archived" />
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      {current.length === 0 && pending.length === 0 && archived.length === 0 ? (
        <p className="text-sm text-zinc-500">Nenhuma assinatura ainda.</p>
      ) : null}
    </div>
  );
}

function SubscriptionRowItem({
  sub,
  variant,
}: {
  sub: SubscriptionRow;
  variant: "active" | "pending" | "archived";
}) {
  const planLabel = PLANS[sub.plano as PlanId]?.label ?? sub.plano;
  const dateRange = (() => {
    const start = new Date(sub.created_at).toLocaleDateString("pt-BR");
    if (sub.current_period_end) {
      const end = new Date(sub.current_period_end).toLocaleDateString("pt-BR");
      return `${start} – ${end}`;
    }
    return `desde ${start}`;
  })();

  const containerClass =
    variant === "active"
      ? "flex items-center justify-between gap-3 rounded-md border border-emerald-200 bg-emerald-50/40 px-3 py-2 dark:border-emerald-900/40 dark:bg-emerald-950/20"
      : variant === "pending"
        ? "flex items-center justify-between gap-3 rounded-md border border-amber-200 bg-amber-50/40 px-3 py-2 dark:border-amber-900/40 dark:bg-amber-950/20"
        : "flex items-center justify-between gap-3 rounded-md px-3 py-1.5 text-xs text-zinc-500";

  return (
    <li className={containerClass}>
      <div className="min-w-0">
        <p className={variant === "archived" ? "text-xs" : "text-sm font-medium"}>
          {planLabel} <span className="text-[10px] text-zinc-500 uppercase">· {sub.provider}</span>
          {sub.cancel_at_period_end ? (
            <span className="ml-1 text-[10px] text-amber-700 dark:text-amber-400">
              · cancelamento agendado
            </span>
          ) : null}
        </p>
        <p className={variant === "archived" ? "text-[10px]" : "text-[11px] text-zinc-500"}>
          {dateRange}
        </p>
      </div>
      <SubscriptionStatusBadge
        status={sub.status}
        canceling={!!sub.cancel_at_period_end}
        small={variant === "archived"}
      />
    </li>
  );
}

function SubscriptionStatusBadge({
  status,
  canceling,
  small,
}: {
  status: string;
  canceling: boolean;
  small?: boolean;
}) {
  const label =
    status === "active" && canceling ? "Ativa (cancelando)" : (STATUS_LABEL[status] ?? status);
  const sizeClass = small ? "text-[10px] px-1.5 py-0" : "";

  if (status === "active") {
    return (
      <Badge
        className={[
          canceling
            ? "border-amber-300 bg-amber-100 text-amber-900 hover:bg-amber-100 dark:border-amber-900/40 dark:bg-amber-950/40 dark:text-amber-200"
            : "border-emerald-300 bg-emerald-100 text-emerald-900 hover:bg-emerald-100 dark:border-emerald-900/40 dark:bg-emerald-950/40 dark:text-emerald-200",
          sizeClass,
        ].join(" ")}
      >
        {label}
      </Badge>
    );
  }
  if (status === "past_due") {
    return (
      <Badge
        className={`border-rose-300 bg-rose-100 text-rose-900 hover:bg-rose-100 dark:border-rose-900/40 dark:bg-rose-950/40 dark:text-rose-200 ${sizeClass}`}
      >
        {label}
      </Badge>
    );
  }
  if (status === "pending") {
    return (
      <Badge
        className={`border-amber-300 bg-amber-100 text-amber-900 hover:bg-amber-100 dark:border-amber-900/40 dark:bg-amber-950/40 dark:text-amber-200 ${sizeClass}`}
      >
        {label}
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className={sizeClass}>
      {label}
    </Badge>
  );
}
