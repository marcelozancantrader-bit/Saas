/**
 * Helper canônico pra Server Actions retornarem falha de plano com payload
 * estruturado. O cliente usa o campo `upgrade` (via UpgradeGateDialog) pra
 * mostrar modal rico com preço, features e CTA — em vez de toast.error plano.
 *
 * Compat retro: `error` continua sendo string, então callers que ainda usam
 * só `r.error` em toast continuam funcionando sem mudança.
 */

import { PLAN_ORDER, getPlanLimits, type PlanId, type PlanLimits } from "@/lib/plans/limits";

export type UpgradeFeatureKey =
  | "diarioObra"
  | "quantitativoIa"
  | "cotacaoFornecedor"
  | "portalClienteEnabled"
  | "whatsappEnabled"
  | "chatDaPlanta"
  | "bibliotecaTemplates"
  | "revisaoHierarquica"
  | "portfolioPublico"
  | "whiteLabel"
  | "brandingCustom"
  | "apiAccess"
  | "templatesContratoMax"
  | "monthlyAiDocs"
  | "maxUsers"
  | "maxActiveProjects"
  | "storageBytes";

export type UpgradeRequirement = {
  /** Identificador da feature bloqueada (analytics + copy custom no UI). */
  feature: UpgradeFeatureKey;
  /** Plano mínimo que destrava a feature. */
  requiredPlan: PlanId;
  /** Plano atual da org (pra exibir contraste). */
  currentPlan: PlanId;
  /** Mensagem amigável (string já localizada, igual ao `error`). */
  message: string;
  /** Pra limites numéricos: estado de uso atual + unidade. */
  limit?: { used: number; limit: number; unit: string };
};

export type ActionFailure = {
  ok: false;
  error: string;
  upgrade?: UpgradeRequirement;
};

const FEATURE_LABELS: Record<UpgradeFeatureKey, string> = {
  diarioObra: "Diário de obra com fotos",
  quantitativoIa: "Quantitativo IA da planta",
  cotacaoFornecedor: "Pedido de cotação de fornecedor",
  portalClienteEnabled: "Portal do cliente",
  whatsappEnabled: "Notificação por WhatsApp",
  chatDaPlanta: "Chat da Planta (IA pro cliente)",
  bibliotecaTemplates: "Biblioteca de templates do escritório",
  revisaoHierarquica: "Revisão hierárquica multi-user",
  portfolioPublico: "Portfólio público",
  whiteLabel: "White-label",
  brandingCustom: "Branding personalizado",
  apiAccess: "Acesso à API",
  templatesContratoMax: "Templates de contrato adicionais",
  monthlyAiDocs: "Mais documentos IA por mês",
  maxUsers: "Mais usuários no workspace",
  maxActiveProjects: "Mais projetos ativos",
  storageBytes: "Mais armazenamento",
};

const PLAN_LABELS: Record<PlanId, string> = {
  free: "Free",
  solo: "Solo",
  pro: "Pro",
  studio: "Studio",
  agency: "Agência",
};

export function getFeatureLabel(feature: UpgradeFeatureKey): string {
  return FEATURE_LABELS[feature];
}

export function getPlanLabel(plan: PlanId): string {
  return PLAN_LABELS[plan];
}

/**
 * Encontra o próximo plano (em ordem canônica) que satisfaz o predicate.
 * Procura primeiro adiante de currentPlan; se não achar, varre todos.
 * Retorna null só se nenhum plano destravar a feature (não deveria acontecer).
 */
export function nextPlanWithFeature(
  currentPlan: PlanId,
  predicate: (limits: PlanLimits) => boolean,
): PlanId | null {
  const startIdx = PLAN_ORDER.indexOf(currentPlan);
  const forward = startIdx >= 0 ? PLAN_ORDER.slice(startIdx + 1) : [];
  for (const candidate of forward) {
    if (predicate(getPlanLimits(candidate))) return candidate;
  }
  // Fallback: olha o catálogo inteiro (caso currentPlan seja inválido).
  for (const candidate of PLAN_ORDER) {
    if (candidate === currentPlan) continue;
    if (predicate(getPlanLimits(candidate))) return candidate;
  }
  return null;
}

type DenyOptions = {
  feature: UpgradeFeatureKey;
  currentPlan: PlanId;
  /** Predicate aplicado em PlanLimits — auto-calcula plano mínimo. */
  requires: (limits: PlanLimits) => boolean;
  /** Mensagem custom; default é "<feature> disponível no plano <X>. Faça upgrade em /billing." */
  message?: string;
  /** Pra limites numéricos (maxUsers, monthlyAiDocs, etc): uso atual. */
  limit?: { used: number; limit: number; unit: string };
};

/**
 * Constrói ActionFailure com payload de upgrade.
 *
 * Exemplo:
 *   if (!limits.diarioObra) {
 *     return denyForUpgrade({
 *       feature: "diarioObra",
 *       currentPlan: org.plano,
 *       requires: (l) => l.diarioObra,
 *     });
 *   }
 */
export function denyForUpgrade(opts: DenyOptions): ActionFailure {
  const required = nextPlanWithFeature(opts.currentPlan, opts.requires);
  const featureLabel = FEATURE_LABELS[opts.feature];
  const planPhrase = required ? `plano ${PLAN_LABELS[required]}` : "um plano superior";
  const message =
    opts.message ??
    `${featureLabel} disponível a partir do ${planPhrase}. Faça upgrade em /billing.`;

  if (required) {
    const upgrade: UpgradeRequirement = {
      feature: opts.feature,
      requiredPlan: required,
      currentPlan: opts.currentPlan,
      message,
    };
    if (opts.limit) upgrade.limit = opts.limit;
    return { ok: false, error: message, upgrade };
  }
  return { ok: false, error: message };
}
