/**
 * Pipeline de geração de documentos por IA — comum aos 4 tipos (memorial,
 * caderno, proposta, contrato).
 *
 * Cada tipo tem seu próprio prompt em lib/ai/prompts/<tipo>.v1.ts, mas todos
 * compartilham o mesmo schema de saída (titulo + sections) — definido em
 * _shared-document-schema.ts. Esta função orquestra a chamada Claude com
 * tool_use, valida a resposta com zod, e retorna o documento estruturado +
 * usage para logging.
 *
 * Não toca em DB nem em Tiptap — é I/O puro com Anthropic. Suitable para
 * Server Actions ou Inngest jobs.
 */

import {
  ANTHROPIC_MODELS,
  getAnthropic,
  summarizeUsage,
  type UsageBreakdown,
} from "@/lib/ai/clients/anthropic";
import {
  generatedDocumentSchema,
  RECORD_DOCUMENT_TOOL_NAME,
  type GeneratedDocument,
} from "@/lib/ai/prompts/_shared-document-schema";
import { captureException } from "@/lib/observability/sentry";
import { withRetry } from "@/lib/ai/retry";
import { callOpenAiStructured, shouldFallbackToOpenAi } from "@/lib/ai/clients/openai";

export type DocumentTipo =
  | "memorial"
  | "caderno"
  | "proposta"
  | "contrato"
  | "memorial_estrutural"
  | "memorial_hidrossanitario"
  | "memorial_eletrico"
  | "ppci"
  | "impermeabilizacao"
  | "cronograma";

export type GenerateDocumentInput = {
  tipo: DocumentTipo;
  /**
   * Diretivas adicionais que serão anexadas ao user message — usado por
   * `contrato` quando o usuário escolhe um template específico (residencial,
   * comercial, reforma, etc). Não cacheia pois muda por template.
   */
  templateAddition?: string | null;
  /** Dados do projeto + extração que viram contexto para o prompt. */
  context: {
    project: {
      nome: string;
      tipologia: string;
      area_prevista_m2: number | null;
      padrao_construtivo: string | null;
      endereco_completo: string | null;
    };
    client: {
      nome: string | null;
      cpf_cnpj: string | null;
      email: string | null;
    } | null;
    extracao_planta?: {
      area_total_m2: number | null;
      numero_pavimentos: number | null;
      ambientes: Array<{ nome: string; area_m2: number | null; tipo: string }>;
      elementos_especiais: {
        piscina: boolean;
        churrasqueira: boolean;
        sacada: boolean;
        garagem: boolean;
        jardim: boolean;
        area_servico_externa: boolean;
      };
      /** Notas livres da IA sobre a planta (incertezas, detalhes notáveis). */
      observacoes?: string | null;
      /** Confiança da IA na extração — útil pra prompts ajustarem hedging. */
      confianca?: "alta" | "media" | "baixa" | null;
    } | null;
  };
};

export type GenerateDocumentOk = {
  ok: true;
  document: GeneratedDocument;
  usage: UsageBreakdown;
  promptVersion: string;
  model: string;
};

export type GenerateDocumentErr = {
  ok: false;
  error: string;
  detail?: string;
  promptVersion: string;
  model: string;
};

export type GenerateDocumentResult = GenerateDocumentOk | GenerateDocumentErr;

async function loadPromptForTipo(tipo: DocumentTipo): Promise<{
  SYSTEM_PROMPT: string;
  TOOL_DEFINITION: {
    name: string;
    description: string;
    input_schema: Record<string, unknown> & { type: "object" };
  };
  PROMPT_VERSION: string;
}> {
  switch (tipo) {
    case "memorial":
      return await import("@/lib/ai/prompts/memorial.v1");
    case "caderno":
      return await import("@/lib/ai/prompts/caderno.v1");
    case "proposta":
      return await import("@/lib/ai/prompts/proposta.v1");
    case "contrato":
      return await import("@/lib/ai/prompts/contrato.v1");
    case "memorial_estrutural":
      return await import("@/lib/ai/prompts/memorial-estrutural.v1");
    case "memorial_hidrossanitario":
      return await import("@/lib/ai/prompts/memorial-hidrossanitario.v1");
    case "memorial_eletrico":
      return await import("@/lib/ai/prompts/memorial-eletrico.v1");
    case "ppci":
      return await import("@/lib/ai/prompts/ppci.v1");
    case "impermeabilizacao":
      return await import("@/lib/ai/prompts/impermeabilizacao.v1");
    case "cronograma":
      return await import("@/lib/ai/prompts/cronograma.v1");
  }
}

/**
 * Renderiza o contexto do projeto em texto Markdown para o user-turn.
 * Mantém o system prompt cacheable (sempre o mesmo) — só o contexto muda.
 */
function renderContextMarkdown(input: GenerateDocumentInput): string {
  const { project, client, extracao_planta } = input.context;
  const lines: string[] = ["## Dados do projeto", ""];
  lines.push(`- **Nome:** ${project.nome}`);
  lines.push(`- **Tipologia:** ${project.tipologia}`);
  if (project.area_prevista_m2) lines.push(`- **Área prevista:** ${project.area_prevista_m2} m²`);
  if (project.padrao_construtivo)
    lines.push(`- **Padrão construtivo:** ${project.padrao_construtivo}`);
  if (project.endereco_completo) lines.push(`- **Endereço:** ${project.endereco_completo}`);

  if (client) {
    lines.push("", "## Cliente", "");
    if (client.nome) lines.push(`- **Nome:** ${client.nome}`);
    if (client.cpf_cnpj) lines.push(`- **CPF/CNPJ:** ${client.cpf_cnpj}`);
    if (client.email) lines.push(`- **E-mail:** ${client.email}`);
  }

  if (extracao_planta) {
    lines.push("", "## Extração da planta (confirmada pelo profissional)", "");
    if (extracao_planta.area_total_m2)
      lines.push(`- **Área total construída:** ${extracao_planta.area_total_m2} m²`);
    if (extracao_planta.numero_pavimentos)
      lines.push(`- **Pavimentos:** ${extracao_planta.numero_pavimentos}`);

    if (extracao_planta.ambientes.length > 0) {
      lines.push("", "### Ambientes");
      for (const a of extracao_planta.ambientes) {
        const areaText = a.area_m2 !== null ? ` (${a.area_m2} m²)` : "";
        lines.push(`- ${a.nome}${areaText} — ${a.tipo}`);
      }
    }

    const especiais = Object.entries(extracao_planta.elementos_especiais)
      .filter(([, v]) => v)
      .map(([k]) => k.replace(/_/g, " "));
    if (especiais.length > 0) {
      lines.push("", `**Elementos especiais:** ${especiais.join(", ")}`);
    }

    if (extracao_planta.observacoes) {
      lines.push("", `**Observações da IA sobre a planta:** ${extracao_planta.observacoes}`);
    }
    if (extracao_planta.confianca === "baixa") {
      lines.push(
        "",
        "> ⚠ A IA marcou a extração com **CONFIANÇA BAIXA** — use linguagem hedged (ex: 'aproximadamente', 'estimativa preliminar') e recomende vistoria/medição em campo no documento.",
      );
    } else if (extracao_planta.confianca === "media") {
      lines.push(
        "",
        "> A IA marcou confiança MÉDIA — pode confiar mas mencione 'sujeito a confirmação técnica em obra'.",
      );
    }
  }

  if (input.templateAddition) {
    lines.push("", "## Diretrizes adicionais (template escolhido pelo profissional)", "");
    lines.push(input.templateAddition);
  }

  lines.push(
    "",
    "Produza o documento conforme as regras do system prompt. Lembre-se: invoque a tool obrigatoriamente.",
  );
  return lines.join("\n");
}

export async function generateDocument(
  input: GenerateDocumentInput,
  options: { timeoutMs?: number } = {},
): Promise<GenerateDocumentResult> {
  const timeoutMs = options.timeoutMs ?? 290_000;
  const model = ANTHROPIC_MODELS.sonnet;

  const { SYSTEM_PROMPT, TOOL_DEFINITION, PROMPT_VERSION } = await loadPromptForTipo(input.tipo);

  const client = getAnthropic();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    // Streaming keeps the HTTP connection alive (SSE pings) and avoids 60s drops
    // by intermediate proxies on long generations (90-180s). Functionally equivalent
    // to .create() — we only consume the final Message via .finalMessage().
    //
    // Retry: 3 tentativas com backoff exponencial em 429/5xx/529. Falhas
    // transientes (rate limit, overload) eram fatais antes do P15.
    const response = await withRetry(
      async () => {
        const stream = client.messages.stream(
          {
            model,
            max_tokens: 16384,
            system: [
              {
                type: "text",
                text: SYSTEM_PROMPT,
                cache_control: { type: "ephemeral" },
              },
            ],
            tools: [TOOL_DEFINITION],
            tool_choice: { type: "tool", name: RECORD_DOCUMENT_TOOL_NAME },
            messages: [
              {
                role: "user",
                content: [{ type: "text", text: renderContextMarkdown(input) }],
              },
            ],
          },
          { signal: controller.signal },
        );
        return await stream.finalMessage();
      },
      {
        maxAttempts: 3,
        baseDelayMs: 2000,
        onRetry: (attempt, err) => {
          const status =
            err && typeof err === "object" && "status" in err
              ? (err as { status: unknown }).status
              : "n/a";
          console.warn(
            `[generate-document] tentativa ${attempt} falhou (status=${status}). Retry…`,
          );
        },
      },
    );

    const toolUse = response.content.find(
      (b) => b.type === "tool_use" && b.name === RECORD_DOCUMENT_TOOL_NAME,
    );
    if (!toolUse || toolUse.type !== "tool_use") {
      return {
        ok: false,
        error: "A IA não retornou o documento estruturado.",
        detail: `stop_reason: ${response.stop_reason}`,
        promptVersion: PROMPT_VERSION,
        model,
      };
    }

    const parsed = generatedDocumentSchema.safeParse(toolUse.input);
    if (!parsed.success) {
      const truncated = response.stop_reason === "max_tokens";
      return {
        ok: false,
        error: truncated
          ? "Documento truncado: a IA atingiu o limite de tokens antes de finalizar."
          : "Resposta da IA não passou pela validação do schema.",
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
      document: parsed.data,
      usage: summarizeUsage(model, response.usage),
      promptVersion: PROMPT_VERSION,
      model,
    };
  } catch (err) {
    // FALLBACK: Claude esgotou retries com 5xx/529/timeout → tenta OpenAI
    // gpt-4o-mini. Documentos podem ter qualidade ligeiramente inferior, mas
    // app continua funcionando durante outages do Anthropic.
    if (shouldFallbackToOpenAi(err)) {
      const fallbackController = new AbortController();
      const fallbackTimer = setTimeout(() => fallbackController.abort(), 120_000);
      try {
        const fallback = await callOpenAiStructured({
          systemPrompt: SYSTEM_PROMPT,
          userPrompt: renderContextMarkdown(input),
          jsonSchema: {
            name: RECORD_DOCUMENT_TOOL_NAME,
            schema: TOOL_DEFINITION.input_schema,
          },
          maxOutputTokens: 16384,
          signal: fallbackController.signal,
        });
        if (fallback.ok) {
          const parsed = generatedDocumentSchema.safeParse(fallback.data);
          if (parsed.success) {
            console.warn(
              `[generate-document] Claude falhou, fallback OpenAI OK (custo $${fallback.usage.usd_cost.toFixed(4)})`,
            );
            return {
              ok: true,
              document: parsed.data,
              usage: {
                input_tokens: fallback.usage.input_tokens,
                output_tokens: fallback.usage.output_tokens,
                cache_creation_input_tokens: 0,
                cache_read_input_tokens: 0,
                usd_cost: fallback.usage.usd_cost,
              },
              promptVersion: `${PROMPT_VERSION}+openai-fallback`,
              model: fallback.model,
            };
          }
        }
      } finally {
        clearTimeout(fallbackTimer);
      }
      // Fallback também falhou — segue pro tratamento de erro original.
    }

    if (err instanceof Error && err.name === "AbortError") {
      return {
        ok: false,
        error: `Timeout de ${timeoutMs}ms ao chamar Claude.`,
        promptVersion: PROMPT_VERSION,
        model,
      };
    }
    if (err && typeof err === "object" && "status" in err) {
      const status = (err as { status: unknown }).status;
      const msg = (err as { message?: string }).message ?? "erro desconhecido";
      const statusText = typeof status === "number" ? String(status) : "erro de transporte";
      return {
        ok: false,
        error: `Anthropic API retornou ${statusText}.`,
        detail: msg,
        promptVersion: PROMPT_VERSION,
        model,
      };
    }
    await captureException(err, {
      tags: { area: "ai.generate-document", prompt_version: PROMPT_VERSION, model },
    });
    return {
      ok: false,
      error: "Falha inesperada na geração do documento.",
      detail: err instanceof Error ? err.message : String(err),
      promptVersion: PROMPT_VERSION,
      model,
    };
  } finally {
    clearTimeout(timer);
  }
}

export const DOCUMENT_LABELS: Record<DocumentTipo, string> = {
  memorial: "Memorial descritivo",
  caderno: "Caderno de especificações",
  proposta: "Proposta comercial",
  contrato: "Contrato de prestação de serviços",
  memorial_estrutural: "Memorial estrutural",
  memorial_hidrossanitario: "Memorial hidrossanitário",
  memorial_eletrico: "Memorial elétrico",
  ppci: "PPCI — Prevenção e combate a incêndio",
  impermeabilizacao: "Memorial de impermeabilização",
  cronograma: "Cronograma físico-financeiro",
};
