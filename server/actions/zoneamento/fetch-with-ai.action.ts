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
  zona_nome: z.string().min(1).max(80).optional(),
});

export type FetchZoneamentoIaInput = z.infer<typeof inputSchema>;

export type ZoneamentoIaResult =
  | {
      ok: true;
      data: {
        cidade_nome: string;
        uf: string;
        lei: string;
        ano_lei: number | null;
        ultima_revisao_ano: number | null;
        fonte_url: string | null;
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
        confianca: "alta" | "media" | "baixa";
        observacao: string | null;
      };
      usd_cost: number;
    }
  | { ok: false; error: string };

const PROMPT_VERSION = "zoneamento-fetch.v1";

const SYSTEM_PROMPT = `Você é um especialista em legislação urbanística brasileira (planos diretores municipais, leis de uso e ocupação do solo, código de obras).

Sua tarefa é, dada uma cidade + UF + (opcionalmente) nome de uma zona urbana, retornar os parâmetros urbanísticos do plano diretor vigente.

REGRAS CRÍTICAS:
1. Use APENAS dados que você sabe com razoável certeza. Quando incerto, marque confianca='baixa' e explique na observacao.
2. NUNCA invente valores. Se não souber, use null e marque o que faltou na observacao.
3. Foque em zonas RESIDENCIAIS típicas. Se a zona não foi especificada, escolha a mais comum (ZR/ZM/ZO de média densidade).
4. Para cidades pequenas sem plano diretor próprio, use null e explique na observacao.
5. SEMPRE preencha 'ano_lei' (ano de promulgação da lei principal — ex: 1999 pra LC 434/1999).
6. SEMPRE preencha 'ultima_revisao_ano' se você souber de revisão posterior (ex: PDDUA de POA: ano_lei=1999, ultima_revisao_ano=2010).
7. Sempre cite a LEI municipal (LC X/ANO, Lei Y/ANO) que rege os parâmetros.

Os parâmetros retornados são ESTIMATIVAS PRÉ-VALIDAÇÃO. O profissional vai confirmar com a prefeitura.`;

const ZONEAMENTO_TOOL = {
  name: "retornar_parametros_zoneamento",
  description: "Retorna os parâmetros urbanísticos da zona consultada.",
  input_schema: {
    type: "object" as const,
    properties: {
      cidade_nome: { type: "string", description: "Nome oficial da cidade" },
      uf: { type: "string", description: "UF da cidade (2 letras)" },
      lei: {
        type: "string",
        description:
          "Lei/LC municipal que rege o zoneamento (ex: 'LC 434/1999 (PDDUA)', 'Lei 16.402/2016')",
      },
      ano_lei: {
        type: "number",
        description:
          "Ano de promulgação da lei principal (ex: 1999 para LC 434/1999). CRÍTICO pra avaliar se está vigente.",
      },
      ultima_revisao_ano: {
        type: "number",
        description:
          "Ano da última revisão significativa da lei, se houver (ex: PDDUA POA: ano_lei=1999, ultima_revisao_ano=2010). OMITIR se nunca foi revisada.",
      },
      fonte_url: {
        type: "string",
        description:
          "URL oficial do plano diretor / lei, se você souber. OMITIR este campo se não souber.",
      },
      zona_codigo: {
        type: "string",
        description: "Sigla curta da zona (ex: 'zr-1', 'mua-1', 'zm-3')",
      },
      zona_label: {
        type: "string",
        description: "Nome completo da zona (ex: 'ZR-1 — Zona Residencial 1')",
      },
      ca_basico: {
        type: "number",
        description: "Coeficiente de aproveitamento básico (ex: 1.0, 1.5, 2.0)",
      },
      ca_maximo: {
        type: "number",
        description: "CA máximo com outorga onerosa. OMITIR se igual ao básico.",
      },
      to_max_pct: {
        type: "number",
        description: "Taxa de ocupação máxima em % (ex: 50, 66.67, 75)",
      },
      permeabilidade_min_pct: {
        type: "number",
        description: "Permeabilidade mínima em %. OMITIR se a lei não exige.",
      },
      altura_max_m: {
        type: "number",
        description: "Altura máxima em metros. OMITIR se sem limite específico.",
      },
      recuo_frontal_m: {
        type: "number",
        description: "Recuo frontal mínimo em metros (geralmente 3-5m)",
      },
      recuo_lateral_m: {
        type: "number",
        description: "Recuo lateral mínimo (1 lateral). OMITIR se não obrigatório.",
      },
      recuo_fundos_m: {
        type: "number",
        description: "Recuo de fundos mínimo. OMITIR se não obrigatório.",
      },
      vagas_por_unidade: {
        type: "number",
        description: "Vagas mínimas de estacionamento por unidade residencial (1, 2, etc)",
      },
      confianca: {
        type: "string",
        enum: ["alta", "media", "baixa"],
        description:
          "Sua confiança: alta=você tem certeza da lei vigente; media=conhece a cidade mas pode ter mudança recente; baixa=cidade pequena, parâmetros estimados pelo padrão regional",
      },
      observacao: {
        type: "string",
        description:
          "Notas importantes (lei revisada, parâmetros padrão usados, exceções típicas, etc). Max 300 chars. OMITIR se nada relevante.",
      },
    },
    required: [
      "cidade_nome",
      "uf",
      "lei",
      "ano_lei",
      "zona_codigo",
      "zona_label",
      "ca_basico",
      "to_max_pct",
      "recuo_frontal_m",
      "vagas_por_unidade",
      "confianca",
    ],
  },
};

export async function fetchZoneamentoIaAction(
  raw: FetchZoneamentoIaInput,
): Promise<ZoneamentoIaResult> {
  const parsed = inputSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: "Parâmetros inválidos (cidade, UF, zona)." };
  }
  const { cidade_nome, uf, zona_nome } = parsed.data;

  const userMessage = zona_nome
    ? `Cidade: ${cidade_nome}/${uf}. Zona: "${zona_nome}". Retorne os parâmetros urbanísticos dessa zona específica.`
    : `Cidade: ${cidade_nome}/${uf}. Não foi especificada zona — escolha a zona residencial de média densidade mais comum dessa cidade e retorne seus parâmetros.`;

  try {
    const client = getAnthropic();
    const response = await client.messages.create({
      model: ANTHROPIC_MODELS.sonnet,
      max_tokens: 2000,
      system: SYSTEM_PROMPT,
      tools: [ZONEAMENTO_TOOL],
      tool_choice: { type: "tool", name: ZONEAMENTO_TOOL.name },
      messages: [{ role: "user", content: userMessage }],
    });

    const toolUse = response.content.find((c) => c.type === "tool_use");
    if (!toolUse || toolUse.type !== "tool_use") {
      return { ok: false, error: "IA não retornou parâmetros estruturados." };
    }
    const data = toolUse.input as Record<string, unknown>;
    const usage = summarizeUsage(ANTHROPIC_MODELS.sonnet, response.usage);

    // Como omitimos campos opcionais, eles podem vir undefined
    const optNum = (v: unknown): number | null =>
      v === undefined || v === null ? null : Number(v);
    const optStr = (v: unknown): string | null =>
      v === undefined || v === null ? null : String(v);

    return {
      ok: true,
      data: {
        cidade_nome: String(data.cidade_nome ?? cidade_nome),
        uf: String(data.uf ?? uf),
        lei: String(data.lei ?? "Não informado"),
        ano_lei: optNum(data.ano_lei),
        ultima_revisao_ano: optNum(data.ultima_revisao_ano),
        fonte_url: optStr(data.fonte_url),
        zona_codigo: String(data.zona_codigo ?? "zona-1"),
        zona_label: String(data.zona_label ?? "Zona residencial"),
        ca_basico: Number(data.ca_basico ?? 1.0),
        ca_maximo: optNum(data.ca_maximo),
        to_max_pct: Number(data.to_max_pct ?? 50),
        permeabilidade_min_pct: optNum(data.permeabilidade_min_pct),
        altura_max_m: optNum(data.altura_max_m),
        recuo_frontal_m: Number(data.recuo_frontal_m ?? 3),
        recuo_lateral_m: optNum(data.recuo_lateral_m),
        recuo_fundos_m: optNum(data.recuo_fundos_m),
        vagas_por_unidade: Number(data.vagas_por_unidade ?? 1),
        confianca: (data.confianca as "alta" | "media" | "baixa") ?? "media",
        observacao: optStr(data.observacao),
      },
      usd_cost: usage.usd_cost,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await captureException(err, {
      tags: { action: "zoneamento.fetch-with-ai", prompt_version: PROMPT_VERSION },
    });
    return { ok: false, error: `Falha ao consultar IA: ${msg}` };
  }
}
