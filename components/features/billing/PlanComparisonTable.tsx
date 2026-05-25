"use client";

import { Fragment, useState } from "react";
import { ChevronDown, ChevronUp, Check, X } from "lucide-react";
import { PLANS, PLAN_ORDER, formatBytes } from "@/lib/plans/limits";

/**
 * Tabela detalhada de comparação de planos — colapsível em /billing.
 * Source-of-truth: lib/plans/limits PLANS[].limits.
 */

type FeatureRow = {
  key: string;
  label: string;
  type: "limit" | "bool" | "negbool" | "bytes";
};

const FEATURE_GROUPS: Array<{ title: string; rows: FeatureRow[] }> = [
  {
    title: "Limites",
    rows: [
      { key: "maxActiveProjects", label: "Projetos ativos", type: "limit" },
      { key: "monthlyAiDocs", label: "Documentos IA / mês", type: "limit" },
      { key: "maxUsers", label: "Usuários", type: "limit" },
      { key: "storageBytes", label: "Armazenamento", type: "bytes" },
    ],
  },
  {
    title: "Geração de documentos",
    rows: [
      { key: "watermarkOnExport", label: "Sem marca d'água nos PDFs", type: "negbool" },
      { key: "templatesContratoMax", label: "Templates de contrato CAU/CREA", type: "limit" },
      { key: "bibliotecaTemplates", label: "Biblioteca de templates da org", type: "bool" },
    ],
  },
  {
    title: "Quantitativo e Orçamento",
    rows: [
      { key: "quantitativoIa", label: "Quantitativo IA da planta", type: "bool" },
      { key: "cotacaoFornecedor", label: "Cotação de fornecedor", type: "bool" },
    ],
  },
  {
    title: "Portal do cliente",
    rows: [
      { key: "portalClienteEnabled", label: "Portal + assinatura digital", type: "bool" },
      { key: "whatsappEnabled", label: "Notificação WhatsApp", type: "bool" },
      { key: "chatDaPlanta", label: "Chat da planta (IA)", type: "bool" },
    ],
  },
  {
    title: "Obra e portfólio",
    rows: [
      { key: "diarioObra", label: "Diário de obra com fotos", type: "bool" },
      { key: "portfolioPublico", label: "Portfólio público /p/<slug>", type: "bool" },
    ],
  },
  {
    title: "Multi-user e branding",
    rows: [
      { key: "revisaoHierarquica", label: "Revisão hierárquica", type: "bool" },
      { key: "brandingCustom", label: "Branding (logo + cores)", type: "bool" },
      { key: "whiteLabel", label: "White-label", type: "bool" },
    ],
  },
  {
    title: "Suporte e integrações",
    rows: [
      { key: "prioritySupport", label: "Suporte prioritário", type: "bool" },
      { key: "apiAccess", label: "API + integrações", type: "bool" },
    ],
  },
];

function renderCell(value: unknown, type: FeatureRow["type"]) {
  if (type === "limit") {
    if (value === null)
      return <span className="font-medium text-blue-600 dark:text-blue-400">∞</span>;
    return <span className="font-medium text-zinc-800 dark:text-zinc-200">{String(value)}</span>;
  }
  if (type === "bytes") {
    return (
      <span className="font-medium text-zinc-800 dark:text-zinc-200">
        {formatBytes(value as number | null)}
      </span>
    );
  }
  const positive = type === "bool" ? value === true : value === false;
  return positive ? (
    <Check className="mx-auto h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
  ) : (
    <X className="mx-auto h-3.5 w-3.5 text-zinc-300 dark:text-zinc-700" />
  );
}

export function PlanComparisonTable() {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-lg border border-zinc-200 dark:border-zinc-800">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-900/40"
      >
        <span>{expanded ? "Ocultar" : "Ver"} comparativo detalhado dos planos</span>
        {expanded ? (
          <ChevronUp className="h-4 w-4" aria-hidden />
        ) : (
          <ChevronDown className="h-4 w-4" aria-hidden />
        )}
      </button>

      {expanded ? (
        <div className="overflow-x-auto border-t border-zinc-200 dark:border-zinc-800">
          <table className="w-full text-xs">
            <thead className="bg-zinc-50 dark:bg-zinc-900/60">
              <tr>
                <th className="sticky left-0 z-10 bg-zinc-50 px-4 py-2 text-left text-[10px] font-semibold tracking-wide text-zinc-500 uppercase dark:bg-zinc-900/60">
                  Funcionalidade
                </th>
                {PLAN_ORDER.map((id) => (
                  <th
                    key={id}
                    className={[
                      "px-2 py-2 text-center text-[10px] font-semibold tracking-wide uppercase",
                      PLANS[id].highlighted ? "text-blue-700 dark:text-blue-400" : "text-zinc-500",
                    ].join(" ")}
                  >
                    {PLANS[id].label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {FEATURE_GROUPS.map((group) => (
                <Fragment key={group.title}>
                  <tr className="bg-zinc-50/50 dark:bg-zinc-900/30">
                    <td
                      colSpan={1 + PLAN_ORDER.length}
                      className="px-4 py-1.5 text-[10px] font-semibold tracking-wider text-zinc-500 uppercase"
                    >
                      {group.title}
                    </td>
                  </tr>
                  {group.rows.map((f) => (
                    <tr key={f.key} className="hover:bg-zinc-50/30 dark:hover:bg-zinc-900/20">
                      <td className="sticky left-0 bg-white px-4 py-2 text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
                        {f.label}
                      </td>
                      {PLAN_ORDER.map((id) => (
                        <td key={id} className="px-2 py-2 text-center">
                          {renderCell((PLANS[id].limits as Record<string, unknown>)[f.key], f.type)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
