/**
 * Pricing v2 — Memorial.ai / Prumai (refactor 2026-05-25).
 *
 * Source-of-truth dos planos, limites técnicos, preços e features-por-plano.
 * Qualquer enforcement de plano (action, RSC, página) lê via getPlanLimits().
 * NUNCA duplique constantes em outros lugares.
 *
 * Decisão histórica:
 *   - v1 (Sprint 7): 4 tiers (free, pro, studio, agency)
 *   - v1.1 (2026-05-18): 5 tiers (free, standard, pro, pro_max, agency) — pricing high-ticket
 *   - v2 (2026-05-25): 4 tiers + agency (free, solo, pro, studio, agency)
 *     com pesquisa de mercado BR provando que standard R$199,90 estava caro
 *     vs concorrentes diretos (Projete, ARQProject, Plana, Projetolist a R$79-103).
 *     Ver PRICING_RESEARCH.md + PRICING_PROPOSAL.md.
 *
 * Migration `20260730000001_pricing_v2.sql` renomeou:
 *   - standard → solo
 *   - pro_max → studio
 *
 * Grandfathering: orgs com `meta.grandfathered_until` mantém preço cobrado
 * até a data — UI usa `getPlanInfoForOrg(org)` em vez de `getPlanInfo(plano)`
 * pra mostrar preço histórico (TODO se necessário; por enquanto exibe preço novo).
 */

export type PlanId = "free" | "solo" | "pro" | "studio" | "agency";

/** Ciclos de cobrança. */
export type BillingCycle = "monthly" | "annual" | "pix_annual";

export type PlanLimits = {
  // ===== Limites quantitativos =====
  /** Projetos com status != 'arquivado'. null = ilimitado. */
  maxActiveProjects: number | null;
  /** Documentos gerados pela IA no mês corrente. null = ilimitado. */
  monthlyAiDocs: number | null;
  /** Usuários (organization_members + invitations pendentes). null = ilimitado. */
  maxUsers: number | null;
  /** Storage total em bytes (Supabase Storage). null = ilimitado. */
  storageBytes: number | null;

  // ===== Branding =====
  /** Marca d'água "Prumai" no rodapé do PDF além do RASCUNHO. */
  watermarkOnExport: boolean;
  /** Logo + cor primária + cor secundária custom no portal/PDFs. */
  brandingCustom: boolean;
  /** White-label completo (esconde Prumai). */
  whiteLabel: boolean;

  // ===== Portal e cliente =====
  /** /portal/[token] acessível pros clientes da org. */
  portalClienteEnabled: boolean;
  /** Chat da Planta (IA Haiku responde dúvidas do cliente). */
  chatDaPlanta: boolean;
  /** Notificação WhatsApp ao enviar doc pro portal (Z-API). */
  whatsappEnabled: boolean;

  // ===== Orçamento e quantitativo =====
  /** Quantitativo IA da planta (prompt v2): porta/janela/louça contadas pela IA. */
  quantitativoIa: boolean;
  /** Pedido de cotação de fornecedor (PDF + XLSX agrupado por família). */
  cotacaoFornecedor: boolean;

  // ===== Obra e portfolio =====
  /** Diário de obra (nova aba, captura câmera celular, fotos). */
  diarioObra: boolean;
  /** Portfólio público /p/[slug] do escritório (vitrine SEO). */
  portfolioPublico: boolean;

  // ===== Templates =====
  /** Quantos templates de contrato CAU acessíveis (Free=1, Solo=3, Pro+=todos 6). null = ilimitado. */
  templatesContratoMax: number | null;
  /** Biblioteca de templates do próprio escritório (org_doc_templates). */
  bibliotecaTemplates: boolean;

  // ===== Multi-user =====
  /** Revisão hierárquica interna do documento (member solicita → owner aprova). */
  revisaoHierarquica: boolean;

  // ===== Outros =====
  /** Suporte prioritário (chat / SLA). */
  prioritySupport: boolean;
  /** API + integrações externas. */
  apiAccess: boolean;
};

export type PlanInfo = {
  id: PlanId;
  label: string;
  /** Preço mensal em centavos BRL. null = "consulta". */
  priceCents: number | null;
  description: string;
  /** Bullet points exibidos no card de upgrade. */
  features: string[];
  /** Destaque visual (plano recomendado). */
  highlighted?: boolean;
  limits: PlanLimits;
};

// =============================================================================
// PLANOS
// =============================================================================

const FREE_LIMITS: PlanLimits = {
  maxActiveProjects: 1,
  monthlyAiDocs: 3,
  maxUsers: 1,
  storageBytes: 100 * 1024 * 1024, // 100 MB
  watermarkOnExport: true,
  brandingCustom: false,
  whiteLabel: false,
  portalClienteEnabled: false,
  chatDaPlanta: false,
  whatsappEnabled: false,
  quantitativoIa: false,
  cotacaoFornecedor: false,
  diarioObra: false,
  portfolioPublico: false,
  templatesContratoMax: 1,
  bibliotecaTemplates: false,
  revisaoHierarquica: false,
  prioritySupport: false,
  apiAccess: false,
};

const SOLO_LIMITS: PlanLimits = {
  maxActiveProjects: 5,
  monthlyAiDocs: 30,
  maxUsers: 1,
  storageBytes: 5 * 1024 * 1024 * 1024, // 5 GB
  watermarkOnExport: false,
  brandingCustom: true,
  whiteLabel: false,
  portalClienteEnabled: true,
  chatDaPlanta: false,
  whatsappEnabled: false,
  quantitativoIa: false,
  cotacaoFornecedor: false,
  diarioObra: false,
  portfolioPublico: true,
  templatesContratoMax: 3,
  bibliotecaTemplates: false,
  revisaoHierarquica: false,
  prioritySupport: false,
  apiAccess: false,
};

const PRO_LIMITS: PlanLimits = {
  maxActiveProjects: 25,
  monthlyAiDocs: 150,
  maxUsers: 3,
  storageBytes: 25 * 1024 * 1024 * 1024, // 25 GB
  watermarkOnExport: false,
  brandingCustom: true,
  whiteLabel: false,
  portalClienteEnabled: true,
  chatDaPlanta: true,
  whatsappEnabled: true,
  quantitativoIa: true,
  cotacaoFornecedor: true,
  diarioObra: true,
  portfolioPublico: true,
  templatesContratoMax: null, // todos os 6
  bibliotecaTemplates: true,
  revisaoHierarquica: false,
  prioritySupport: true,
  apiAccess: false,
};

const STUDIO_LIMITS: PlanLimits = {
  maxActiveProjects: null,
  monthlyAiDocs: 500,
  maxUsers: 10,
  storageBytes: 100 * 1024 * 1024 * 1024, // 100 GB
  watermarkOnExport: false,
  brandingCustom: true,
  whiteLabel: false,
  portalClienteEnabled: true,
  chatDaPlanta: true,
  whatsappEnabled: true,
  quantitativoIa: true,
  cotacaoFornecedor: true,
  diarioObra: true,
  portfolioPublico: true,
  templatesContratoMax: null,
  bibliotecaTemplates: true,
  revisaoHierarquica: true,
  prioritySupport: true,
  apiAccess: true,
};

const AGENCY_LIMITS: PlanLimits = {
  maxActiveProjects: null,
  monthlyAiDocs: null,
  maxUsers: null,
  storageBytes: null,
  watermarkOnExport: false,
  brandingCustom: true,
  whiteLabel: true,
  portalClienteEnabled: true,
  chatDaPlanta: true,
  whatsappEnabled: true,
  quantitativoIa: true,
  cotacaoFornecedor: true,
  diarioObra: true,
  portfolioPublico: true,
  templatesContratoMax: null,
  bibliotecaTemplates: true,
  revisaoHierarquica: true,
  prioritySupport: true,
  apiAccess: true,
};

export const PLANS: Record<PlanId, PlanInfo> = {
  free: {
    id: "free",
    label: "Free",
    priceCents: 0,
    description: "Para experimentar a plataforma.",
    features: [
      "1 projeto ativo",
      "3 documentos IA por mês",
      "1 template de contrato",
      "Marca d'água nos PDFs",
      "100 MB de armazenamento",
    ],
    limits: FREE_LIMITS,
  },
  solo: {
    id: "solo",
    label: "Solo",
    priceCents: 8990,
    description: "Profissional autônomo com 1-3 projetos por mês.",
    features: [
      "5 projetos ativos",
      "30 documentos IA por mês",
      "Portal do cliente + assinatura digital",
      "Portfólio público do escritório",
      "Branding completo (logo + cores)",
      "3 templates de contrato",
      "5 GB de armazenamento",
    ],
    limits: SOLO_LIMITS,
  },
  pro: {
    id: "pro",
    label: "Pro",
    priceCents: 21990,
    description: "Profissional consolidado com 5-10 projetos por mês.",
    highlighted: true,
    features: [
      "25 projetos ativos",
      "150 documentos IA por mês",
      "Quantitativo IA da planta",
      "Diário de obra com fotos",
      "WhatsApp Business (Z-API)",
      "Cotação de fornecedor",
      "Chat da planta (IA pro cliente)",
      "6 templates de contrato CAU",
      "Biblioteca de templates do escritório",
      "3 usuários + suporte prioritário",
      "25 GB de armazenamento",
    ],
    limits: PRO_LIMITS,
  },
  studio: {
    id: "studio",
    label: "Studio",
    priceCents: 49990,
    description: "Escritório com equipe e fluxo de aprovação interna.",
    features: [
      "Projetos ilimitados",
      "500 documentos IA por mês",
      "Tudo do plano Pro",
      "Revisão hierárquica multi-user",
      "10 usuários no workspace",
      "API (read-only)",
      "100 GB de armazenamento",
    ],
    limits: STUDIO_LIMITS,
  },
  agency: {
    id: "agency",
    label: "Agência",
    priceCents: null,
    description: "Para construtoras e escritórios com 10+ profissionais.",
    features: [
      "Tudo ilimitado",
      "White-label completo",
      "Multi-org",
      "API completa",
      "SLA dedicado",
      "Onboarding personalizado",
    ],
    limits: AGENCY_LIMITS,
  },
};

/** Ordem canônica dos planos para exibição. */
export const PLAN_ORDER: PlanId[] = ["free", "solo", "pro", "studio", "agency"];

// =============================================================================
// CICLOS DE COBRANÇA
// =============================================================================

export type CycleInfo = {
  id: BillingCycle;
  label: string;
  description: string;
  /** Desconto aplicado sobre preço mensal (0-100). */
  discountPercent: number;
  /** Multiplicador de meses cobrados ao mesmo tempo. */
  monthsCharged: number;
  /** Renovação automática? */
  autoRenews: boolean;
};

export const CYCLES: Record<BillingCycle, CycleInfo> = {
  monthly: {
    id: "monthly",
    label: "Mensal",
    description: "Cobrança recorrente todo mês no cartão.",
    discountPercent: 0,
    monthsCharged: 1,
    autoRenews: true,
  },
  annual: {
    id: "annual",
    label: "Anual",
    description: "12 meses cobrados de uma vez, renovação automática.",
    discountPercent: 20,
    monthsCharged: 12,
    autoRenews: true,
  },
  pix_annual: {
    id: "pix_annual",
    label: "PIX à vista anual",
    description: "12 meses no PIX à vista. Avisamos antes de vencer pra renovar.",
    discountPercent: 25,
    monthsCharged: 12,
    autoRenews: false,
  },
};

export const CYCLE_ORDER: BillingCycle[] = ["monthly", "annual", "pix_annual"];

/**
 * Calcula o preço efetivo em centavos pra um plano + ciclo.
 * Retorna valor MENSAL (já com desconto aplicado) e valor TOTAL cobrado no ciclo.
 *
 * Ex: pro (R$ 219,90) + annual → effective_monthly_cents = 17592 (R$ 175,92),
 *     total_cycle_cents = 17592 * 12 = 211100 (R$ 2.111,00).
 */
export function calculateCyclePrice(
  planId: PlanId,
  cycle: BillingCycle,
): { effectiveMonthlyCents: number; totalCycleCents: number } | null {
  const monthly = PLANS[planId].priceCents;
  if (monthly === null) return null; // Agência sob consulta
  const c = CYCLES[cycle];
  const effective = Math.round((monthly * (100 - c.discountPercent)) / 100);
  return {
    effectiveMonthlyCents: effective,
    totalCycleCents: effective * c.monthsCharged,
  };
}

// =============================================================================
// HELPERS
// =============================================================================

export function getPlanLimits(planId: PlanId): PlanLimits {
  return PLANS[planId].limits;
}

export function getPlanInfo(planId: PlanId): PlanInfo {
  return PLANS[planId];
}

export function formatBrlFromCents(cents: number | null): string {
  if (cents === null) return "Consultar";
  if (cents === 0) return "Grátis";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

export function formatBytes(bytes: number | null): string {
  if (bytes === null) return "Ilimitado";
  const gb = bytes / (1024 * 1024 * 1024);
  if (gb >= 1) return `${gb.toFixed(0)} GB`;
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(0)} MB`;
}

// =============================================================================
// LIMIT CHECKERS (pure, sem server-only)
// =============================================================================

export type PlanLimitCheck =
  | { ok: true }
  | { ok: false; reason: string; limit: number; used: number };

export function checkAiDocLimit(used: number, limit: number | null): PlanLimitCheck {
  if (limit === null || used < limit) return { ok: true };
  return {
    ok: false,
    reason: `Limite do plano atingido: ${limit} documentos IA neste mês.`,
    limit,
    used,
  };
}

export function checkActiveProjectLimit(used: number, limit: number | null): PlanLimitCheck {
  if (limit === null || used < limit) return { ok: true };
  return {
    ok: false,
    reason: `Limite do plano atingido: ${limit} projetos ativos.`,
    limit,
    used,
  };
}

export function checkUserLimit(used: number, limit: number | null): PlanLimitCheck {
  if (limit === null || used < limit) return { ok: true };
  return {
    ok: false,
    reason: `Limite do plano atingido: ${limit} ${limit === 1 ? "usuário" : "usuários"}.`,
    limit,
    used,
  };
}
