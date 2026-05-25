/**
 * Constantes de marca centralizadas — facilita o rebrand Memorial.ai → Prumai
 * quando o domínio prumai.com.br estiver registrado (ver MIGRATION_CHECKLIST.md).
 *
 * Uso: importe `PRODUCT_NAME` ao invés de digitar "Memorial.ai" hardcoded.
 *
 * Atualmente o rebrand ainda não aconteceu (depende de domínio + DNS).
 * Quando rodar, este arquivo é o único que muda — N callers absorvem
 * automaticamente.
 */

export const PRODUCT_NAME = "Memorial.ai";
export const PRODUCT_NAME_SHORT = "Memorial";
export const PRODUCT_LEGAL_NAME = "Memorial.ai Tecnologia";
export const PRODUCT_TAGLINE = "Memorial técnico em minutos";

/**
 * Domínio principal (sem protocolo). Atualizar quando migrar pra prumai.com.br.
 * Diferente de `env.NEXT_PUBLIC_APP_URL` que pode apontar pra Vercel preview.
 */
export const PRODUCT_DOMAIN = "memorial-ai-mu.vercel.app";

/**
 * E-mail de contato/suporte. Atualizar para suporte@prumai.com.br no rebrand.
 */
export const SUPPORT_EMAIL = "suporte@memorial.ai";
