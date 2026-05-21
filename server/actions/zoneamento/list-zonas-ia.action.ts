"use server";

import { z } from "zod";
import { getAnthropic, ANTHROPIC_MODELS, summarizeUsage } from "@/lib/ai/clients/anthropic";
import { captureException } from "@/lib/observability/sentry";

const inputSchema = z.object({
  cidade_nome: z.string().min(2).max(120),
  uf: z
    .string()
    .length(2)
    .regex(/^[A-Z]{2}$/),
});

export type ListZonasIaInput = z.infer<typeof inputSchema>;

export type ListZonasIaResult =
  | {
      ok: true;
      data: {
        cidade_nome: string;
        uf: string;
        lei: string;
        ano_lei: number | null;
        ultima_revisao_ano: number | null;
        fonte_url: string | null;
        zonas: Array<{
          zona_codigo: string;
          zona_label: string;
          ca_basico: number;
          ca_maximo: number | null;
          to_max_pct: number;
          permeabilidade_min_pct: number | null;
          altura_max_m: number | null;
          recuo_frontal_m: number;
          recuo_lateral_m: number | null;
          recuo_fundos_m: number | null;
          vagas_por_unidade: number;
          observacao: string | null;
        }>;
        confianca: "alta" | "media" | "baixa";
      };
      usd_cost: number;
    }
  | { ok: false; error: string };

const PROMPT_VERSION = "zoneamento-list-zonas.v1";

const SYSTEM_PROMPT = `Você é um especialista em legislação urbanística brasileira.

Sua tarefa: dada uma cidade + UF, retornar TODAS as zonas residenciais comuns daquele plano diretor (até 8 zonas mais relevantes), com seus parâmetros urbanísticos completos.

REGRAS CRÍTICAS:
1. Inclua APENAS zonas RESIDENCIAIS (baixa, média e alta densidade). NÃO inclua zonas comerciais, industriais, especiais (ZEIS, APA, área histórica).
2. SEMPRE preencha 'ano_lei' (ano de promulgação da lei principal — ex: 1999 pra LC 434/1999).
3. SEMPRE preencha 'ultima_revisao_ano' se houver revisão posterior.
4. Use APENAS dados que você sabe com certeza. Quando incerto, marque confianca='baixa' e explique.
5. NUNCA invente zonas que não existem na lei. Se a cidade não tem plano diretor próprio (município muito pequeno), retorne array vazio e marque confianca='baixa'.
6. Pra zonas: ca_basico, to_max_pct, recuo_frontal_m e vagas_por_unidade são OBRIGATÓRIOS. Os demais campos podem ser omitidos se a lei não exigir.

Os parâmetros retornados são ESTIMATIVAS PRÉ-VALIDAÇÃO. O profissional vai escolher uma zona e confirmar com a prefeitura.`;

const LIST_ZONAS_TOOL = {
  name: "listar_zonas_cidade",
  description: "Lista as zonas residenciais do plano diretor da cidade.",
  input_schema: {
    type: "object" as const,
    properties: {
      cidade_nome: { type: "string", description: "Nome oficial da cidade" },
      uf: { type: "string", description: "UF (2 letras)" },
      lei: {
        type: "string",
        description: "Lei/LC municipal (ex: 'LC 434/1999 (PDDUA)')",
      },
      ano_lei: {
        type: "number",
        description: "Ano de promulgação da lei principal",
      },
      ultima_revisao_ano: {
        type: "number",
        description: "Ano da última revisão significativa. OMITIR se nunca foi revisada.",
      },
      fonte_url: {
        type: "string",
        description: "URL oficial do plano diretor. OMITIR se não souber.",
      },
      zonas: {
        type: "array",
        description: "Lista de zonas residenciais. Mínimo 1, máximo 8.",
        items: {
          type: "object",
          properties: {
            zona_codigo: {
              type: "string",
              description: "Sigla curta da zona (ex: 'zr-1', 'mua-1')",
            },
            zona_label: {
              type: "string",
              description:
                "Nome completo da zona (ex: 'ZR-1 — Zona Residencial 1 (baixa densidade)')",
            },
            ca_basico: {
              type: "number",
              description: "Coeficiente de aproveitamento básico",
            },
            ca_maximo: {
              type: "number",
              description: "CA máximo com outorga. OMITIR se igual ao básico.",
            },
            to_max_pct: {
              type: "number",
              description: "Taxa de ocupação máxima em %",
            },
            permeabilidade_min_pct: {
              type: "number",
              description: "Permeabilidade mínima em %. OMITIR se não obrigatório.",
            },
            altura_max_m: {
              type: "number",
              description: "Altura máxima em m. OMITIR se sem limite.",
            },
            recuo_frontal_m: {
              type: "number",
              description: "Recuo frontal em m",
            },
            recuo_lateral_m: {
              type: "number",
              description: "Recuo lateral em m. OMITIR se não obrigatório.",
            },
            recuo_fundos_m: {
              type: "number",
              description: "Recuo de fundos em m. OMITIR se não obrigatório.",
            },
            vagas_por_unidade: {
              type: "number",
              description: "Vagas mínimas por unidade residencial",
            },
            observacao: {
              type: "string",
              description:
                "Nota curta sobre a zona (ex: 'baixa densidade'). OMITIR se nada relevante.",
            },
          },
          required: [
            "zona_codigo",
            "zona_label",
            "ca_basico",
            "to_max_pct",
            "recuo_frontal_m",
            "vagas_por_unidade",
          ],
        },
      },
      confianca: {
        type: "string",
        enum: ["alta", "media", "baixa"],
        description:
          "Confiança: alta=lei vigente conhecida; media=conhece mas pode ter mudança recente; baixa=cidade pequena ou parâmetros estimados",
      },
    },
    required: ["cidade_nome", "uf", "lei", "ano_lei", "zonas", "confianca"],
  },
};

export async function listZonasCidadeIaAction(raw: ListZonasIaInput): Promise<ListZonasIaResult> {
  const parsed = inputSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: "Cidade e UF são obrigatórios." };
  }
  const { cidade_nome, uf } = parsed.data;

  try {
    const client = getAnthropic();
    const response = await client.messages.create({
      model: ANTHROPIC_MODELS.sonnet,
      max_tokens: 4000,
      system: SYSTEM_PROMPT,
      tools: [LIST_ZONAS_TOOL],
      tool_choice: { type: "tool", name: LIST_ZONAS_TOOL.name },
      messages: [
        {
          role: "user",
          content: `Liste as zonas residenciais do plano diretor de ${cidade_nome}/${uf} com seus parâmetros completos.`,
        },
      ],
    });

    const toolUse = response.content.find((c) => c.type === "tool_use");
    if (!toolUse || toolUse.type !== "tool_use") {
      return { ok: false, error: "IA não retornou zonas estruturadas." };
    }
    const data = toolUse.input as Record<string, unknown>;
    const usage = summarizeUsage(ANTHROPIC_MODELS.sonnet, response.usage);

    const optNum = (v: unknown): number | null =>
      v === undefined || v === null ? null : Number(v);
    const optStr = (v: unknown): string | null =>
      v === undefined || v === null ? null : String(v);

    const zonasRaw = (data.zonas as Array<Record<string, unknown>>) ?? [];
    const zonas = zonasRaw.map((z) => ({
      zona_codigo: String(z.zona_codigo ?? "zona"),
      zona_label: String(z.zona_label ?? "Zona"),
      ca_basico: Number(z.ca_basico ?? 1.0),
      ca_maximo: optNum(z.ca_maximo),
      to_max_pct: Number(z.to_max_pct ?? 50),
      permeabilidade_min_pct: optNum(z.permeabilidade_min_pct),
      altura_max_m: optNum(z.altura_max_m),
      recuo_frontal_m: Number(z.recuo_frontal_m ?? 3),
      recuo_lateral_m: optNum(z.recuo_lateral_m),
      recuo_fundos_m: optNum(z.recuo_fundos_m),
      vagas_por_unidade: Number(z.vagas_por_unidade ?? 1),
      observacao: optStr(z.observacao),
    }));

    if (zonas.length === 0) {
      return {
        ok: false,
        error:
          "IA não encontrou zonas residenciais. Confirme se essa cidade tem plano diretor próprio ou insira os parâmetros manualmente.",
      };
    }

    return {
      ok: true,
      data: {
        cidade_nome: String(data.cidade_nome ?? cidade_nome),
        uf: String(data.uf ?? uf),
        lei: String(data.lei ?? "Não informado"),
        ano_lei: optNum(data.ano_lei),
        ultima_revisao_ano: optNum(data.ultima_revisao_ano),
        fonte_url: optStr(data.fonte_url),
        zonas,
        confianca: (data.confianca as "alta" | "media" | "baixa") ?? "media",
      },
      usd_cost: usage.usd_cost,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await captureException(err, {
      tags: { action: "zoneamento.list-zonas-ia", prompt_version: PROMPT_VERSION },
    });
    return { ok: false, error: `Falha ao consultar IA: ${msg}` };
  }
}
