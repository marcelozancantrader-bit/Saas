/**
 * Retry com exponential backoff + jitter pra chamadas LLM.
 *
 * Retryable por padrão: AbortError NÃO (timeout do caller é intencional),
 * 429 (rate limit), 529 (overloaded Anthropic), 5xx (server error).
 *
 * Uso típico:
 *   const response = await withRetry(() =>
 *     client.messages.create({...}, { signal })
 *   );
 */

export type RetryOptions = {
  /** Tentativas totais incluindo a primeira (default 3). */
  maxAttempts?: number;
  /** Delay base entre tentativas em ms (default 1000). Cresce 2^n + jitter. */
  baseDelayMs?: number;
  /** Predicado custom; default cobre 429/529/5xx HTTP. */
  isRetryable?: (err: unknown) => boolean;
  /** Hook por tentativa (pra logging). */
  onRetry?: (attempt: number, err: unknown, delayMs: number) => void;
};

export async function withRetry<T>(fn: () => Promise<T>, opts: RetryOptions = {}): Promise<T> {
  const maxAttempts = opts.maxAttempts ?? 3;
  const baseDelayMs = opts.baseDelayMs ?? 1000;
  const isRetryable = opts.isRetryable ?? defaultIsRetryable;

  let lastErr: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (attempt === maxAttempts || !isRetryable(err)) throw err;
      const delay = baseDelayMs * Math.pow(2, attempt - 1) + Math.random() * 500;
      opts.onRetry?.(attempt, err, delay);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastErr;
}

function defaultIsRetryable(err: unknown): boolean {
  if (err instanceof Error && err.name === "AbortError") return false;
  if (err && typeof err === "object" && "status" in err) {
    const s = (err as { status: number }).status;
    return s === 429 || s === 529 || (s >= 500 && s < 600);
  }
  // Network errors do fetch (sem status) — retentar
  if (err instanceof TypeError && /fetch/i.test(err.message)) return true;
  return false;
}
