// See note in lib/ai/clients/anthropic.ts — server-only marker omitted so the
// extraction logic is testable from tsx without Next's build pipeline.
import {
  ANTHROPIC_MODELS,
  getAnthropic,
  summarizeUsage,
  type UsageBreakdown,
} from "@/lib/ai/clients/anthropic";
import {
  PROMPT_VERSION,
  SYSTEM_PROMPT,
  TOOL_DEFINITION,
  TOOL_NAME,
  floorPlanExtractionSchema,
  type FloorPlanExtraction,
} from "@/lib/ai/prompts/extract-floor-plan.v2";
import { captureException } from "@/lib/observability/sentry";

const MAX_PDF_BYTES = 32 * 1024 * 1024; // 32 MB hard cap per Anthropic PDF support

export type ExtractFloorPlanInput = {
  pdfBytes: Buffer | Uint8Array;
  /** For logging/debugging only — never sent to the model. */
  filename?: string;
};

export type ExtractFloorPlanOk = {
  ok: true;
  data: FloorPlanExtraction;
  usage: UsageBreakdown;
  promptVersion: string;
  model: string;
};

export type ExtractFloorPlanErr = {
  ok: false;
  error: string;
  detail?: string;
  promptVersion: string;
  model: string;
};

export type ExtractFloorPlanResult = ExtractFloorPlanOk | ExtractFloorPlanErr;

/**
 * Extracts structured floor plan data from a PDF using Claude Sonnet 4.6 vision.
 * Pure function — no I/O beyond the Anthropic API call. Suitable for both Server
 * Actions and Inngest jobs.
 *
 * Guardrails:
 *   - timeout via AbortSignal (60s default)
 *   - tool_use enforces structure; response also validated with zod
 *   - returns typed { ok: true, data } | { ok: false, error }
 */
export async function extractFloorPlanData(
  input: ExtractFloorPlanInput,
  options: { timeoutMs?: number } = {},
): Promise<ExtractFloorPlanResult> {
  const { pdfBytes, filename } = input;
  const timeoutMs = options.timeoutMs ?? 60_000;
  const model = ANTHROPIC_MODELS.sonnet;

  if (pdfBytes.length === 0) {
    return {
      ok: false,
      error: "PDF vazio.",
      promptVersion: PROMPT_VERSION,
      model,
    };
  }
  if (pdfBytes.length > MAX_PDF_BYTES) {
    return {
      ok: false,
      error: `PDF maior que 32 MB (${Math.round(pdfBytes.length / 1024 / 1024)} MB). Reduza o arquivo.`,
      promptVersion: PROMPT_VERSION,
      model,
    };
  }

  const base64 = Buffer.from(pdfBytes).toString("base64");
  const client = getAnthropic();

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await client.messages.create(
      {
        model,
        max_tokens: 4096,
        system: [
          {
            type: "text",
            text: SYSTEM_PROMPT,
            cache_control: { type: "ephemeral" },
          },
        ],
        tools: [TOOL_DEFINITION],
        tool_choice: { type: "tool", name: TOOL_NAME },
        messages: [
          {
            role: "user",
            content: [
              {
                type: "document",
                source: {
                  type: "base64",
                  media_type: "application/pdf",
                  data: base64,
                },
                ...(filename ? { title: filename } : {}),
              },
              {
                type: "text",
                text: "Analise esta planta baixa e extraia os dados estruturados. Lembre-se de invocar a tool record_floor_plan_extraction.",
              },
            ],
          },
        ],
      },
      { signal: controller.signal },
    );

    const toolUse = response.content.find(
      (block) => block.type === "tool_use" && block.name === TOOL_NAME,
    );

    if (!toolUse || toolUse.type !== "tool_use") {
      return {
        ok: false,
        error: "A IA não retornou os dados estruturados.",
        detail: `stop_reason: ${response.stop_reason}`,
        promptVersion: PROMPT_VERSION,
        model,
      };
    }

    const parsed = floorPlanExtractionSchema.safeParse(toolUse.input);
    if (!parsed.success) {
      return {
        ok: false,
        error: "Resposta da IA não passou pela validação do schema.",
        detail: parsed.error.issues
          .slice(0, 3)
          .map((i) => `${i.path.join(".")}: ${i.message}`)
          .join("; "),
        promptVersion: PROMPT_VERSION,
        model,
      };
    }

    return {
      ok: true,
      data: parsed.data,
      usage: summarizeUsage(model, response.usage),
      promptVersion: PROMPT_VERSION,
      model,
    };
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      return {
        ok: false,
        error: `Timeout de ${timeoutMs}ms ao chamar Claude.`,
        promptVersion: PROMPT_VERSION,
        model,
      };
    }
    if (err && typeof err === "object" && "status" in err) {
      const status = (err as { status: number }).status;
      const msg = (err as { message?: string }).message ?? "erro desconhecido";
      return {
        ok: false,
        error: `Anthropic API retornou ${status}.`,
        detail: msg,
        promptVersion: PROMPT_VERSION,
        model,
      };
    }
    await captureException(err, {
      tags: { area: "ai.extract-floor-plan", prompt_version: PROMPT_VERSION, model },
    });
    return {
      ok: false,
      error: "Falha inesperada na extração.",
      detail: err instanceof Error ? err.message : String(err),
      promptVersion: PROMPT_VERSION,
      model,
    };
  } finally {
    clearTimeout(timer);
  }
}
