/**
 * Memorial.ai — IA puxa regras de zoneamento do Plano Diretor de qualquer cidade BR.
 *
 * Usa Claude Sonnet 4.6 + tool_use pra retornar estrutura validada.
 * Devolve a zona MAIS COMUM pra residencial unifamiliar (ZR-1/ZR-2/equivalente).
 *
 * Custo médio: ~$0.005 por consulta. Confiança marcada como "media" (cidade pode ter
 * atualizado o plano sem o knowledge cutoff refletir).
 */

import { getAnthropic, ANTHROPIC_MODELS, summarizeUsage } from "./clients/anthropic";

export type FetchedZoneamento = {
  cidade_nome: string;
  uf: string;
  zona_codigo: string;
  zona_label: string;
  ca_basico: number;
  ca_maximo: number;
  to_max_pct: number;
  altura_max_m: number | null;
  recuo_frontal_m: number | null;
  recuo_lateral_m: number | null;
  recuo_fundos_m: number | null;
  vagas_por_unidade: number;
  permeabilidade_min_pct: number | null;
  lei: string;
  ano_lei: number | null;
  ultima_revisao_ano: number | null;
  fonte_url: string | null;
  confianca: "alta" | "media" | "baixa";
  observacao: string | null;
  _usage: ReturnType<typeof summarizeUsage>;
};

const TOOL_SCHEMA = {
  name: "responder_zoneamento",
  description:
    "Retorna os parâmetros de zoneamento residencial unifamiliar de menor restrição (ZR-1/ZR-2/equivalente) da cidade brasileira informada.",
  input_schema: {
    type: "object",
    properties: {
      cidade_nome: { type: "string", description: "Nome oficial da cidade" },
      uf: { type: "string", description: "Sigla da UF (2 letras maiúsculas)" },
      zona_codigo: {
        type: "string",
        description: "Código da zona (ex.: ZR-1, ZR-3, MR, ZCV).",
      },
      zona_label: { type: "string", description: "Nome legível da zona." },
      ca_basico: {
        type: "number",
        description: "Coeficiente de aproveitamento básico (CA).",
      },
      ca_maximo: {
        type: "number",
        description: "Coeficiente de aproveitamento máximo com outorga.",
      },
      to_max_pct: {
        type: "number",
        description: "Taxa de ocupação máxima em porcentagem (0-100).",
      },
      altura_max_m: {
        type: ["number", "null"],
        description: "Altura máxima em metros. null se não há limite específico.",
      },
      recuo_frontal_m: {
        type: ["number", "null"],
        description: "Recuo frontal mínimo em metros.",
      },
      recuo_lateral_m: {
        type: ["number", "null"],
        description: "Recuo lateral mínimo em metros. null se não exigido.",
      },
      recuo_fundos_m: {
        type: ["number", "null"],
        description: "Recuo de fundos mínimo em metros. null se não exigido.",
      },
      vagas_por_unidade: {
        type: "number",
        description: "Vagas de garagem mínimas por unidade residencial.",
      },
      permeabilidade_min_pct: {
        type: ["number", "null"],
        description: "% mínimo do terreno permeável. null se não exigido.",
      },
      lei: {
        type: "string",
        description: "Identificação da lei (ex.: 'LC 434/1999' ou 'Lei Municipal 9.800/2000').",
      },
      ano_lei: {
        type: ["number", "null"],
        description: "Ano de promulgação da lei principal do plano diretor.",
      },
      ultima_revisao_ano: {
        type: ["number", "null"],
        description: "Ano da última revisão conhecida do plano diretor (se houver).",
      },
      fonte_url: {
        type: ["string", "null"],
        description:
          "URL pública oficial onde a lei pode ser consultada (LeisMunicipais ou IPLAN/IPPUC).",
      },
      confianca: {
        type: "string",
        enum: ["alta", "media", "baixa"],
        description:
          "Confiança da resposta: 'alta' se você lembra a lei especificamente; 'media' se inferiu de práticas regionais; 'baixa' se chutou.",
      },
      observacao: {
        type: ["string", "null"],
        description:
          "Aviso pro profissional verificar — ex.: 'cidade revisou em 2024, valores podem estar desatualizados'.",
      },
    },
    required: [
      "cidade_nome",
      "uf",
      "zona_codigo",
      "zona_label",
      "ca_basico",
      "ca_maximo",
      "to_max_pct",
      "altura_max_m",
      "recuo_frontal_m",
      "recuo_lateral_m",
      "recuo_fundos_m",
      "vagas_por_unidade",
      "permeabilidade_min_pct",
      "lei",
      "ano_lei",
      "ultima_revisao_ano",
      "fonte_url",
      "confianca",
      "observacao",
    ],
  },
};

const SYSTEM_PROMPT = `Você é especialista em urbanismo e planos diretores brasileiros.
Sua tarefa: dado o nome de uma cidade + UF, retornar os parâmetros de zoneamento
residencial unifamiliar de MENOR restrição (ZR-1, ZR-2 ou equivalente — a zona
mais "comum" pra casas de família).

Regras importantes:
- Use apenas conhecimento sobre legislação municipal brasileira pública.
- Se a cidade tem múltiplas zonas residenciais, escolha a mais comum (ZR-1 ou
  equivalente) — não a mais restritiva nem a mais permissiva.
- Se você NÃO LEMBRA especificamente do plano diretor desta cidade, marque
  confianca='baixa' e use estimativa baseada em cidades vizinhas da mesma região
  e porte populacional similar.
- SEMPRE preencha a observacao alertando o profissional pra verificar com a
  prefeitura ou IPLAN/IPPUC/órgão equivalente.
- Recuos: se o plano não diferencia direito/esquerdo, use recuo_lateral_m único
  pra ambos.
- Use SEMPRE a ferramenta responder_zoneamento — não responda em texto livre.`;

export async function fetchPlanoDirector(opts: {
  cidade_nome: string;
  uf: string;
}): Promise<FetchedZoneamento> {
  const client = getAnthropic();
  const model = ANTHROPIC_MODELS.sonnet;

  const res = await client.messages.create({
    model,
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    tools: [TOOL_SCHEMA as never],
    tool_choice: { type: "tool", name: "responder_zoneamento" },
    messages: [
      {
        role: "user",
        content: `Qual o zoneamento residencial unifamiliar mais comum (ZR-1 ou equivalente) de ${opts.cidade_nome}/${opts.uf}? Use a ferramenta responder_zoneamento.`,
      },
    ],
  });

  const toolUse = res.content.find((c) => c.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    throw new Error("IA não retornou tool_use — não foi possível obter zoneamento.");
  }

  const data = toolUse.input as Omit<FetchedZoneamento, "_usage">;

  return {
    ...data,
    uf: data.uf.toUpperCase(),
    _usage: summarizeUsage(model, res.usage),
  };
}
