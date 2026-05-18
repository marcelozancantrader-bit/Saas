// Note: NOT marked `import "server-only"` so that the DoD test runner (tsx) can
// import this module. Next.js still prevents client-side bundling because
// process.env.ANTHROPIC_API_KEY is server-only by Next's env resolution
// (no NEXT_PUBLIC_ prefix).
import Anthropic from "@anthropic-ai/sdk";
import { env } from "@/lib/validators/env";

/**
 * Singleton Anthropic client.
 *
 * Models used in this codebase (per ADR-005, registered when Sprint 3 lands):
 *   - claude-sonnet-4-6  — vision + structured outputs, main extraction & generation
 *   - claude-haiku-4-5   — fast/cheap fallback for short transforms (Sprint 5+)
 *
 * Pricing (cached: skill claude-api, 2026-04-29):
 *   sonnet-4-6: $3.00 / 1M input, $15.00 / 1M output
 *   cache reads: ~0.1x base, cache writes (5min TTL): ~1.25x base
 */

let _client: Anthropic | null = null;

export function getAnthropic(): Anthropic {
  if (!env.ANTHROPIC_API_KEY) {
    throw new Error(
      "ANTHROPIC_API_KEY not set in .env.local — required for AI features (Sprint 3+).",
    );
  }
  if (!_client) {
    _client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  }
  return _client;
}

export const ANTHROPIC_MODELS = {
  /** Vision + structured outputs, main extraction & generation. $3/$15 per 1M. */
  sonnet: "claude-sonnet-4-6",
  /** Fast / cheap fallback for short transforms. $1/$5 per 1M. */
  haiku: "claude-haiku-4-5",
} as const;

export type ModelId = (typeof ANTHROPIC_MODELS)[keyof typeof ANTHROPIC_MODELS];

// Per-million-token USD prices (input / output / cache write / cache read).
// Keep in sync with claude-api skill model table.
const PRICING: Record<ModelId, { in: number; out: number; cw: number; cr: number }> = {
  "claude-sonnet-4-6": { in: 3.0, out: 15.0, cw: 3.75, cr: 0.3 },
  "claude-haiku-4-5": { in: 1.0, out: 5.0, cw: 1.25, cr: 0.1 },
};

export type UsageBreakdown = {
  input_tokens: number;
  output_tokens: number;
  cache_creation_input_tokens: number;
  cache_read_input_tokens: number;
  usd_cost: number;
};

export function tokensToUsd(model: ModelId, usage: Anthropic.Usage): number {
  const p = PRICING[model];
  return (
    (usage.input_tokens * p.in +
      usage.output_tokens * p.out +
      (usage.cache_creation_input_tokens ?? 0) * p.cw +
      (usage.cache_read_input_tokens ?? 0) * p.cr) /
    1_000_000
  );
}

export function summarizeUsage(model: ModelId, usage: Anthropic.Usage): UsageBreakdown {
  return {
    input_tokens: usage.input_tokens,
    output_tokens: usage.output_tokens,
    cache_creation_input_tokens: usage.cache_creation_input_tokens ?? 0,
    cache_read_input_tokens: usage.cache_read_input_tokens ?? 0,
    usd_cost: tokensToUsd(model, usage),
  };
}
