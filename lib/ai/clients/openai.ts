/**
 * Cliente OpenAI mínimo via fetch (sem SDK npm).
 *
 * Usado APENAS como fallback de `generate-document.ts` quando Anthropic Claude
 * falha (5xx, timeout, overload) APÓS esgotar retries. Quando OPENAI_API_KEY
 * não está configurada, retorna erro graciosamente e o caller mostra o erro
 * original do Anthropic.
 *
 * Compatibilidade de schema: o `input_schema` dos tools Anthropic já é JSON
 * Schema válido — usamos direto no `response_format: { type: "json_schema" }`
 * da OpenAI. Funciona pra todos os 10 tipos de documento (memorial, contrato,
 * etc) sem precisar adaptar prompts.
 *
 * Limitações conhecidas:
 *   - Sem prompt caching (OpenAI tem caching automático mas API diferente).
 *   - Sem streaming (chamadas de doc longo podem timeout em 60s de proxies).
 *   - gpt-4o-mini é menos capaz que sonnet-4-6; documento gerado pode ter
 *     qualidade inferior. Pra fallback de disaster recovery, é suficiente.
 */

import { env } from "@/lib/validators/env";

// gpt-4o-mini pricing (jan/2026): $0.15 / 1M input, $0.60 / 1M output.
const OPENAI_MODEL_PRICING = {
  "gpt-4o-mini": { in: 0.15, out: 0.6 },
} as const;

type OpenAiModel = keyof typeof OPENAI_MODEL_PRICING;

export type OpenAiUsage = {
  input_tokens: number;
  output_tokens: number;
  usd_cost: number;
};

export type OpenAiStructuredResult =
  | { ok: true; data: unknown; usage: OpenAiUsage; model: string }
  | { ok: false; error: string; detail?: string };

export type OpenAiStructuredInput = {
  systemPrompt: string;
  userPrompt: string;
  /** JSON Schema (compatível com Anthropic `input_schema`). */
  jsonSchema: { name: string; schema: Record<string, unknown> };
  model?: OpenAiModel;
  maxOutputTokens?: number;
  signal?: AbortSignal;
};

export async function callOpenAiStructured(
  input: OpenAiStructuredInput,
): Promise<OpenAiStructuredResult> {
  if (!env.OPENAI_API_KEY) {
    return { ok: false, error: "OPENAI_API_KEY não configurada — fallback desativado." };
  }

  const model = input.model ?? "gpt-4o-mini";
  const maxTokens = input.maxOutputTokens ?? 16384;

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model,
        max_completion_tokens: maxTokens,
        response_format: {
          type: "json_schema",
          json_schema: {
            name: input.jsonSchema.name,
            schema: input.jsonSchema.schema,
            strict: false,
          },
        },
        messages: [
          { role: "system", content: input.systemPrompt },
          { role: "user", content: input.userPrompt },
        ],
      }),
      signal: input.signal,
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      return {
        ok: false,
        error: `OpenAI API retornou ${response.status}.`,
        detail: text.slice(0, 200),
      };
    }

    const json = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
      usage?: { prompt_tokens?: number; completion_tokens?: number };
    };

    const content = json.choices?.[0]?.message?.content;
    if (!content) {
      return { ok: false, error: "OpenAI não retornou content na resposta." };
    }

    let data: unknown;
    try {
      data = JSON.parse(content);
    } catch (e) {
      return {
        ok: false,
        error: "OpenAI retornou JSON inválido.",
        detail: e instanceof Error ? e.message : String(e),
      };
    }

    const inputTokens = json.usage?.prompt_tokens ?? 0;
    const outputTokens = json.usage?.completion_tokens ?? 0;
    const pricing = OPENAI_MODEL_PRICING[model];
    const usd_cost = (inputTokens * pricing.in + outputTokens * pricing.out) / 1_000_000;

    return {
      ok: true,
      data,
      usage: { input_tokens: inputTokens, output_tokens: outputTokens, usd_cost },
      model,
    };
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      return { ok: false, error: "Timeout na chamada OpenAI." };
    }
    return {
      ok: false,
      error: "Falha de transporte ao chamar OpenAI.",
      detail: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Verifica se um erro do Anthropic é candidato a fallback OpenAI.
 * Critério: 5xx (server error), 529 (overloaded), timeout. NÃO faz fallback
 * em 4xx (bad request, auth) porque o problema é nosso, não do provider.
 */
export function shouldFallbackToOpenAi(err: unknown): boolean {
  if (!env.OPENAI_API_KEY) return false;
  if (err instanceof Error && err.name === "AbortError") return true;
  if (err && typeof err === "object" && "status" in err) {
    const s = (err as { status: number }).status;
    return s === 529 || (s >= 500 && s < 600);
  }
  return false;
}
