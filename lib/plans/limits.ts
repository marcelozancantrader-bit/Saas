/**
 * Sprint 7 — definição dos planos e limites técnicos.
 *
 * Source-of-truth do que cada plano permite. Quaisquer mudanças de limite
 * vão aqui (não espalhe constantes pelo código). Os enforcement points
 * importam estes valores via getPlanLimits(plano).
 *
 * Preços e copy ficam aqui também porque /billing e cards de upgrade os
 * exibem; é o mesmo set de dados.
 */

export type PlanId = "free" | "pro" | "studio" | "agency";

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
};

export type PlanInfo = {
  id: PlanId;
  label: string;
  /** Preço mensal em centavos BRL. null = "consulta". */
  priceCents: number | null;
  description: string;
  /** Bullet points exibidos no card de upgrade. */
  features: string[];
  limits: PlanLimits;
};

export const PLANS: Record<PlanId, PlanInfo> = {
  free: {
    id: "free",
    label: "Free",
    priceCents: 0,
    description: "Para experimentar.",
    features: [
      "2 projetos ativos",
      "5 documentos IA por mês",
      "Marca d'água nos PDFs",
      "Sem portal do cliente",
      "1 usuário",
    ],
    limits: {
      maxActiveProjects: 2,
      monthlyAiDocs: 5,
      maxUsers: 1,
      watermarkOnExport: true,
      portalClienteEnabled: false,
      brandingCustom: false,
    },
  },
  pro: {
    id: "pro",
    label: "Pro",
    priceCents: 14900,
    description: "Profissional autônomo.",
    features: [
      "Projetos ilimitados",
      "50 documentos IA por mês",
      "Sem marca d'água",
      "Portal do cliente ativo",
      "1 usuário",
    ],
    limits: {
      maxActiveProjects: null,
      monthlyAiDocs: 50,
      maxUsers: 1,
      watermarkOnExport: false,
      portalClienteEnabled: true,
      brandingCustom: false,
    },
  },
  studio: {
    id: "studio",
    label: "Studio",
    priceCents: 34900,
    description: "Pequeno escritório com 2-5 profissionais.",
    features: [
      "Projetos ilimitados",
      "200 documentos IA por mês",
      "5 usuários",
      "Portal do cliente ativo",
      "Branding completo (logo + cores)",
    ],
    limits: {
      maxActiveProjects: null,
      monthlyAiDocs: 200,
      maxUsers: 5,
      watermarkOnExport: false,
      portalClienteEnabled: true,
      brandingCustom: true,
    },
  },
  agency: {
    id: "agency",
    label: "Agency",
    priceCents: null,
    description: "Para escritórios com 5+ profissionais.",
    features: [
      "Ilimitado em tudo",
      "Branding completo",
      "Onboarding dedicado",
      "Suporte prioritário",
    ],
    limits: {
      maxActiveProjects: null,
      monthlyAiDocs: null,
      maxUsers: null,
      watermarkOnExport: false,
      portalClienteEnabled: true,
      brandingCustom: true,
    },
  },
};

export function getPlanLimits(planId: PlanId): PlanLimits {
  return PLANS[planId].limits;
}

export function getPlanInfo(planId: PlanId): PlanInfo {
  return PLANS[planId];
}

export function formatBrlFromCents(cents: number | null): string {
  if (cents === null) return "consulta";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
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
