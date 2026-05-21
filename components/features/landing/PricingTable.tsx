"use client";

import { useState } from "react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { PLAN_ORDER, PLANS, formatBrlFromCents } from "@/lib/plans/limits";
import { Check, X } from "lucide-react";

const FEATURES = [
  { key: "maxActiveProjects", label: "Projetos ativos", type: "limit" as const },
  { key: "monthlyAiDocs", label: "Documentos IA / mês", type: "limit" as const },
  { key: "maxUsers", label: "Usuários", type: "limit" as const },
  { key: "watermarkOnExport", label: "Sem marca d'água", type: "negbool" as const },
  { key: "portalClienteEnabled", label: "Portal do cliente", type: "bool" as const },
  { key: "brandingCustom", label: "Branding completo (logo + cor)", type: "bool" as const },
  { key: "prioritySupport", label: "Suporte prioritário", type: "bool" as const },
  { key: "apiAccess", label: "API + integrações", type: "bool" as const },
];

function renderCell(value: unknown, type: "limit" | "bool" | "negbool") {
  if (type === "limit") {
    if (value === null)
      return <span className="font-semibold text-blue-600 dark:text-blue-400">Ilimitado</span>;
    return <span className="font-semibold text-zinc-800 dark:text-zinc-200">{String(value)}</span>;
  }
  // bool: true = ✓ verde, false = X cinza
  // negbool: true = X (marca d'água ativa), false = ✓
  const positive = type === "bool" ? value === true : value === false;
  return positive ? (
    <Check className="mx-auto h-4 w-4 text-emerald-600 dark:text-emerald-400" />
  ) : (
    <X className="mx-auto h-4 w-4 text-zinc-400" />
  );
}

export function PricingTable() {
  const [expanded, setExpanded] = useState(false);

  return (
    <section
      id="planos"
      className="border-y border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/40"
    >
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="text-center">
          <p className="text-sm tracking-wider text-blue-700 uppercase dark:text-blue-400">
            Planos
          </p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
            Comece grátis. Faça upgrade quando fizer sentido.
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg leading-relaxed text-zinc-600 dark:text-zinc-400">
            Sem fidelidade. Cancele a qualquer momento dentro do app.
          </p>
        </div>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {PLAN_ORDER.map((id) => {
            const p = PLANS[id];
            const isHighlighted = p.highlighted;
            return (
              <div
                key={id}
                className={[
                  "relative flex flex-col rounded-xl border bg-white p-6 transition-all dark:bg-zinc-900",
                  isHighlighted
                    ? "border-blue-500 ring-2 ring-blue-500 dark:border-blue-500"
                    : "border-zinc-200 dark:border-zinc-800",
                ].join(" ")}
              >
                {isHighlighted ? (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-blue-600 px-3 py-1 text-xs font-medium text-white">
                    Recomendado
                  </span>
                ) : null}
                <p className="text-lg font-semibold">{p.label}</p>
                <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{p.description}</p>
                <p className="mt-4 text-3xl font-bold">
                  {formatBrlFromCents(p.priceCents)}
                  {p.priceCents !== null && p.priceCents > 0 ? (
                    <span className="ml-1 text-sm font-normal text-zinc-500">/mês</span>
                  ) : null}
                </p>
                <ul className="mt-4 flex-1 space-y-2 text-sm text-zinc-700 dark:text-zinc-300">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <span className="mt-0.5 text-blue-600 dark:text-blue-400" aria-hidden>
                        ✓
                      </span>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href={id === "agency" ? "mailto:contato@memorial.ai" : "/signup"}
                  className={buttonVariants({
                    variant: isHighlighted ? "default" : "outline",
                    className: "mt-6 w-full",
                  })}
                >
                  {id === "free"
                    ? "Começar grátis"
                    : id === "agency"
                      ? "Falar com a equipe"
                      : "Assinar"}
                </Link>
              </div>
            );
          })}
        </div>

        <div className="mt-10 text-center">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="text-sm font-medium text-blue-700 hover:underline dark:text-blue-400"
          >
            {expanded ? "Ocultar tabela detalhada" : "Ver tabela detalhada de funcionalidades →"}
          </button>
        </div>

        {expanded && (
          <div className="mt-6 overflow-x-auto rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 dark:bg-zinc-900/60">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold tracking-wide text-zinc-500 uppercase">
                    Funcionalidade
                  </th>
                  {PLAN_ORDER.map((id) => (
                    <th
                      key={id}
                      className={`px-3 py-3 text-center text-xs font-semibold tracking-wide uppercase ${
                        PLANS[id].highlighted ? "text-blue-700 dark:text-blue-400" : "text-zinc-500"
                      }`}
                    >
                      {PLANS[id].label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {FEATURES.map((feature) => (
                  <tr key={feature.key} className="border-t border-zinc-200 dark:border-zinc-800">
                    <td className="px-4 py-3 text-zinc-800 dark:text-zinc-200">{feature.label}</td>
                    {PLAN_ORDER.map((id) => {
                      const limits = PLANS[id].limits as unknown as Record<string, unknown>;
                      return (
                        <td key={id} className="px-3 py-3 text-center">
                          {renderCell(limits[feature.key], feature.type)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
