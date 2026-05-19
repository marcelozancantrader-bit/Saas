/**
 * Sprint 7 + UX overhaul — definição dos planos e limites técnicos.
 *
 * Source-of-truth do que cada plano permite. Quaisquer mudanças de limite
 * vão aqui (não espalhe constantes pelo código). Os enforcement points
 * importam estes valores via getPlanLimits(plano).
 *
 * Preços e copy ficam aqui também porque /billing e cards de upgrade os
 * exibem; é o mesmo set de dados.
 *
 * Reestruturação 2026-05-18 (pricing high-ticket BR):
 *   - free, standard (R$199,90), pro (R$449,90), pro_max (R$699,90), agency (consulta)
 */

export type PlanId = "free" | "standard" | "pro" | "pro_max" | "agency";

export type PlanLimits = {
  /** Projetos com status != 'arquivado'. null = ilimitado. */
  maxActiveProjects: number | null;
  /** Documentos gerados pela IA no mês corrente. null = ilimitado. */
  monthlyAiDocs: number | null;
  /** Usuários (organization_members). null = ilimitado. */
  maxUsers: number | null;
  /** Se true, o PDF exportado leva marca d'água "Memorial.ai" no rodapé além do RASCUNHO. */
  watermarkOnExport: boolean;
  /** Se true, /portal/[token] está acessível para os clients dessa org. */
  portalClienteEnabled: boolean;
  /** Permite logo + cor primária custom no portal/PDFs. */
  brandingCustom: boolean;
  /** Suporte prioritário (Pro+). */
  prioritySupport: boolean;
  /** API + integrações (Pro Max+). */
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

export const PLANS: Record<PlanId, PlanInfo> = {
  free: {
    id: "free",
    label: "Free",
    priceCents: 0,
    description: "Para experimentar a plataforma.",
    features: [
      "2 projetos ativos",
      "3 documentos IA por mês",
      "Marca d'água nos PDFs",
      "Sem portal do cliente",
      "1 usuário",
    ],
    limits: {
      maxActiveProjects: 2,
      monthlyAiDocs: 3,
      maxUsers: 1,
      watermarkOnExport: true,
      portalClienteEnabled: false,
      brandingCustom: false,
      prioritySupport: false,
      apiAccess: false,
    },
  },
  standard: {
    id: "standard",
    label: "Standard",
    priceCents: 19990,
    description: "Profissional autônomo com até 1 projeto/mês.",
    features: [
      "10 projetos ativos",
      "30 documentos IA por mês",
      "Sem marca d'água",
      "Portal do cliente ativo",
      "Branding completo (logo + cor)",
      "1 usuário",
    ],
    limits: {
      maxActiveProjects: 10,
      monthlyAiDocs: 30,
      maxUsers: 1,
      watermarkOnExport: false,
      portalClienteEnabled: true,
      brandingCustom: true,
      prioritySupport: false,
      apiAccess: false,
    },
  },
  pro: {
    id: "pro",
    label: "Pro",
    priceCents: 44990,
    description: "Profissional com volume médio (3–10 projetos/mês).",
    highlighted: true,
    features: [
      "Projetos ilimitados",
      "100 documentos IA por mês",
      "Portal do cliente ativo",
      "Branding completo",
      "3 usuários (você + parceiros)",
      "Suporte prioritário",
    ],
    limits: {
      maxActiveProjects: null,
      monthlyAiDocs: 100,
      maxUsers: 3,
      watermarkOnExport: false,
      portalClienteEnabled: true,
      brandingCustom: true,
      prioritySupport: true,
      apiAccess: false,
    },
  },
  pro_max: {
    id: "pro_max",
    label: "Pro Max",
    priceCents: 69990,
    description: "Escritório com equipe e maior volume de projetos.",
    features: [
      "Projetos ilimitados",
      "300 documentos IA por mês",
      "10 usuários",
      "Branding completo",
      "Suporte prioritário",
      "API (em breve)",
    ],
    limits: {
      maxActiveProjects: null,
      monthlyAiDocs: 300,
      maxUsers: 10,
      watermarkOnExport: false,
      portalClienteEnabled: true,
      brandingCustom: true,
      prioritySupport: true,
      apiAccess: false,
    },
  },
  agency: {
    id: "agency",
    label: "Agência",
    priceCents: null,
    description: "Para escritórios e construtoras com 10+ profissionais.",
    features: [
      "Tudo ilimitado",
      "White-label",
      "SLA dedicado",
      "Onboarding personalizado",
      "Integração custom",
    ],
    limits: {
      maxActiveProjects: null,
      monthlyAiDocs: null,
      maxUsers: null,
      watermarkOnExport: false,
      portalClienteEnabled: true,
      brandingCustom: true,
      prioritySupport: true,
      apiAccess: true,
    },
  },
};

/** Ordem canônica dos planos para exibição. */
export const PLAN_ORDER: PlanId[] = ["free", "standard", "pro", "pro_max", "agency"];

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

/**
 * Limit checkers (pure). Recebem o usage atual e retornam ok/bloqueio com motivo.
 * Vivem aqui (não em plan-usage.ts) pra não importarem `server-only` — assim podem
 * ser usadas tanto em RSC quanto em DoD tests que rodam fora do Next.
 */

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
