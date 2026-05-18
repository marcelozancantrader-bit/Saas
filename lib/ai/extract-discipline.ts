// Extração de disciplinas complementares (Sprint 9).
// Genérico: recebe a disciplina + PDF, escolhe o prompt certo e roda contra Claude Sonnet 4.6.
// Reaproveita os helpers de `lib/ai/clients/anthropic.ts`.

import {
  ANTHROPIC_MODELS,
  getAnthropic,
  summarizeUsage,
  type UsageBreakdown,
} from "@/lib/ai/clients/anthropic";
import type { ZodTypeAny } from "zod";
import type { Disciplina } from "@/lib/ai/prompts/_shared-extraction-schema";

import * as electrical from "@/lib/ai/prompts/extract-electrical.v1";
import * as hydraulic from "@/lib/ai/prompts/extract-hydraulic.v1";
import * as structural from "@/lib/ai/prompts/extract-structural.v1";
import * as gas from "@/lib/ai/prompts/extract-gas.v1";
import * as hvac from "@/lib/ai/prompts/extract-hvac.v1";

const MAX_PDF_BYTES = 32 * 1024 * 1024;

type PromptModule = {
  SYSTEM_PROMPT: string;
  TOOL_NAME: string;
  TOOL_DEFINITION: { name: string; description: string; input_schema: Record<string, unknown> };
  PROMPT_VERSION: string;
  schema: ZodTypeAny;
};

const MODULES: Record<Exclude<Disciplina, "architectural">, PromptModule> = {
  electrical: { ...electrical, schema: electrical.electricalExtractionSchema },
  hydraulic: { ...hydraulic, schema: hydraulic.hydraulicExtractionSchema },
  structural: { ...structural, schema: structural.structuralExtractionSchema },
  gas: { ...gas, schema: gas.gasExtractionSchema },
  hvac: { ...hvac, schema: hvac.hvacExtractionSchema },
};

export type DisciplineExtractionInput = {
  disciplina: Exclude<Disciplina, "architectural">;
  pdfBytes: Buffer | Uint8Array;
  filename?: string;
};

export type DisciplineExtractionOk = {
  ok: true;
  data: unknown;
  usage: UsageBreakdown;
  promptVersion: string;
  model: string;
  disciplina: Exclude<Disciplina, "architectural">;
};

export type DisciplineExtractionErr = {
  ok: false;
  error: string;
  detail?: string;
  promptVersion: string;
  model: string;
  disciplina: Exclude<Disciplina, "architectural">;
};

export type DisciplineExtractionResult = DisciplineExtractionOk | DisciplineExtractionErr;

export async function extractDisciplineData(
  input: DisciplineExtractionInput,
  options: { timeoutMs?: number } = {},
): Promise<DisciplineExtractionResult> {
  const { disciplina, pdfBytes, filename } = input;
  const mod = MODULES[disciplina];
  const timeoutMs = options.timeoutMs ?? 60_000;
  const model = ANTHROPIC_MODELS.sonnet;

  if (pdfBytes.length === 0) {
    return { ok: false, error: "PDF vazio.", promptVersion: mod.PROMPT_VERSION, model, disciplina };
  }
  if (pdfBytes.length > MAX_PDF_BYTES) {
    return {
      ok: false,
      error: `PDF maior que 32 MB (${Math.round(pdfBytes.length / 1024 / 1024)} MB).`,
      promptVersion: mod.PROMPT_VERSION,
      model,
      disciplina,
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
            text: mod.SYSTEM_PROMPT,
            cache_control: { type: "ephemeral" },
          },
        ],
        tools: [mod.TOOL_DEFINITION as never],
        tool_choice: { type: "tool", name: mod.TOOL_NAME },
        messages: [
          {
            role: "user",
            content: [
              {
                type: "document",
                source: { type: "base64", media_type: "application/pdf", data: base64 },
                ...(filename ? { title: filename } : {}),
              },
              {
                type: "text",
                text: `Analise este PDF do projeto ${disciplina} e extraia os dados estruturados. Lembre-se de invocar a tool ${mod.TOOL_NAME}.`,
              },
            ],
          },
        ],
      },
      { signal: controller.signal },
    );

    const toolUse = response.content.find(
      (block) => block.type === "tool_use" && block.name === mod.TOOL_NAME,
    );
    if (!toolUse || toolUse.type !== "tool_use") {
      return {
        ok: false,
        error: "A IA não retornou os dados estruturados.",
        detail: `stop_reason: ${response.stop_reason}`,
        promptVersion: mod.PROMPT_VERSION,
        model,
        disciplina,
      };
    }

    const parsed = mod.schema.safeParse(toolUse.input);
    if (!parsed.success) {
      return {
        ok: false,
        error: "Resposta da IA não passou pela validação do schema.",
        detail: parsed.error.issues
          .slice(0, 3)
          .map((i) => `${i.path.map(String).join(".")}: ${i.message}`)
          .join("; "),
        promptVersion: mod.PROMPT_VERSION,
        model,
        disciplina,
      };
    }

    return {
      ok: true,
      data: parsed.data,
      usage: summarizeUsage(model, response.usage),
      promptVersion: mod.PROMPT_VERSION,
      model,
      disciplina,
    };
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      return {
        ok: false,
        error: `Timeout de ${timeoutMs}ms ao chamar Claude.`,
        promptVersion: mod.PROMPT_VERSION,
        model,
        disciplina,
      };
    }
    if (err && typeof err === "object" && "status" in err) {
      const status = (err as { status: number }).status;
      const msg = (err as { message?: string }).message ?? "erro desconhecido";
      return {
        ok: false,
        error: `Anthropic API retornou ${status}.`,
        detail: msg,
        promptVersion: mod.PROMPT_VERSION,
        model,
        disciplina,
      };
    }
    return {
      ok: false,
      error: "Falha inesperada na extração.",
      detail: err instanceof Error ? err.message : String(err),
      promptVersion: mod.PROMPT_VERSION,
      model,
      disciplina,
    };
  } finally {
    clearTimeout(timer);
  }
}
