/**
 * Metadata client-safe das métricas (P18).
 *
 * Fica separado de `metrics.ts` (server-only) porque o editor visual precisa
 * listar as métricas pro usuário escolher — sem precisar executá-las no browser.
 */

export type MetricUnit = "BRL" | "USD" | "count" | "bytes";

export type MetricCatalogEntry = {
  id: string;
  label: string;
  description: string;
  unit: MetricUnit;
  category: "Receita" | "Custo" | "Atividade" | "Operação";
};

export const METRIC_CATALOG: Record<string, MetricCatalogEntry> = {
  "ai.cost_usd_24h": {
    id: "ai.cost_usd_24h",
    label: "Custo IA (US$) nas últimas 24h",
    description: "Soma de documents.custo_tokens.cost_usd das últimas 24h.",
    unit: "USD",
    category: "Custo",
  },
  "ai.cost_usd_1h": {
    id: "ai.cost_usd_1h",
    label: "Custo IA (US$) na última 1h",
    description: "Soma de documents.custo_tokens.cost_usd da última hora.",
    unit: "USD",
    category: "Custo",
  },
  "signups.count_24h": {
    id: "signups.count_24h",
    label: "Signups nas últimas 24h",
    description: "Quantidade de organizations criadas nas últimas 24h.",
    unit: "count",
    category: "Atividade",
  },
  "signups.count_1h": {
    id: "signups.count_1h",
    label: "Signups na última 1h",
    description: "Quantidade de organizations criadas na última hora.",
    unit: "count",
    category: "Atividade",
  },
  "payments.overdue_count_now": {
    id: "payments.overdue_count_now",
    label: "Pagamentos atrasados agora",
    description: "Subscriptions com status='past_due' neste exato momento.",
    unit: "count",
    category: "Receita",
  },
  "subscriptions.active_count_now": {
    id: "subscriptions.active_count_now",
    label: "Assinaturas ativas agora",
    description: "Subscriptions com status='active' neste exato momento.",
    unit: "count",
    category: "Receita",
  },
  "trials.active_count_now": {
    id: "trials.active_count_now",
    label: "Trials ativos agora",
    description: "Subscriptions com status='trialing' neste exato momento.",
    unit: "count",
    category: "Receita",
  },
  "documents.generated_count_24h": {
    id: "documents.generated_count_24h",
    label: "Documentos gerados nas últimas 24h",
    description: "Linhas inseridas em documents nas últimas 24h.",
    unit: "count",
    category: "Atividade",
  },
  "automations.failed_count_24h": {
    id: "automations.failed_count_24h",
    label: "Automações falhadas nas últimas 24h",
    description: "Runs em admin_automation_runs com status='failed' nas últimas 24h.",
    unit: "count",
    category: "Operação",
  },
};

export const METRICS_BY_CATEGORY: Record<string, MetricCatalogEntry[]> = Object.values(
  METRIC_CATALOG,
).reduce(
  (acc, entry) => {
    if (!acc[entry.category]) acc[entry.category] = [];
    acc[entry.category]!.push(entry);
    return acc;
  },
  {} as Record<string, MetricCatalogEntry[]>,
);

export function formatMetricValue(value: number, unit: MetricUnit): string {
  switch (unit) {
    case "BRL":
      return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
    case "USD":
      return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
    case "bytes":
      if (value >= 1024 ** 3) return `${(value / 1024 ** 3).toFixed(2)} GB`;
      if (value >= 1024 ** 2) return `${(value / 1024 ** 2).toFixed(2)} MB`;
      if (value >= 1024) return `${(value / 1024).toFixed(2)} KB`;
      return `${value} B`;
    case "count":
    default:
      return new Intl.NumberFormat("pt-BR").format(value);
  }
}

const OP_LABELS: Record<string, string> = {
  gt: ">",
  gte: "≥",
  lt: "<",
  lte: "≤",
  eq: "=",
};

export function formatMetricCondition(metricId: string, op: string, threshold: number): string {
  const entry = METRIC_CATALOG[metricId];
  const opLabel = OP_LABELS[op] ?? op;
  if (!entry) return `${metricId} ${opLabel} ${threshold}`;
  return `${entry.label} ${opLabel} ${formatMetricValue(threshold, entry.unit)}`;
}
