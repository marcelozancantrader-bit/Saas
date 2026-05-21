import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export type RateLimitOptions = {
  /** Identificador único da janela. Ex: `signup:1.2.3.4`, `ai-doc:org-uuid`, `portal-chat:token`. */
  key: string;
  /** Máximo de eventos permitidos na janela. */
  limit: number;
  /** Duração da janela em milissegundos. */
  windowMs: number;
};

export type RateLimitResult =
  | { ok: true; remaining: number }
  | { ok: false; retryAfterSeconds: number };

/**
 * Sliding window rate limiter usando Postgres.
 *
 * Falha aberta: se o DB rejeitar a query (ex: tabela ausente, RLS quebrada),
 * libera o request — rate-limit não pode derrubar usuário legítimo.
 *
 * Use chaves específicas por endpoint pra evitar colisão:
 *   `signup:<ip>` — signups por IP
 *   `forgot:<ip>` — password reset por IP
 *   `ai-doc:<org_id>` — geração de doc IA por org
 *   `portal-chat:<token>` — chat portal por client
 */
export async function checkRateLimit(opts: RateLimitOptions): Promise<RateLimitResult> {
  const admin = createAdminClient();
  const since = new Date(Date.now() - opts.windowMs).toISOString();

  const { count, error: countErr } = await admin
    .from("rate_limit_events")
    .select("id", { count: "exact", head: true })
    .eq("key", opts.key)
    .gte("created_at", since);

  if (countErr) {
    console.warn(`[ratelimit] count failed for "${opts.key}", allowing:`, countErr.message);
    return { ok: true, remaining: opts.limit - 1 };
  }

  const used = count ?? 0;
  if (used >= opts.limit) {
    return { ok: false, retryAfterSeconds: Math.ceil(opts.windowMs / 1000) };
  }

  const { error: insErr } = await admin.from("rate_limit_events").insert({ key: opts.key });
  if (insErr) {
    console.warn(`[ratelimit] insert failed for "${opts.key}":`, insErr.message);
  }

  if (Math.random() < 0.01) {
    void admin.rpc("cleanup_rate_limit_events");
  }

  return { ok: true, remaining: opts.limit - used - 1 };
}

/** Mensagem amigável padronizada pra retornar nas actions quando bloqueado. */
export function rateLimitError(retryAfterSeconds: number): string {
  const minutes = Math.ceil(retryAfterSeconds / 60);
  if (minutes <= 1) return "Muitas tentativas. Tente novamente em alguns segundos.";
  if (minutes < 60) return `Muitas tentativas. Tente novamente em ${minutes} minutos.`;
  const hours = Math.ceil(minutes / 60);
  return `Muitas tentativas. Tente novamente em ${hours} ${hours === 1 ? "hora" : "horas"}.`;
}
