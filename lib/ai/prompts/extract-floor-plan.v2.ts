import { z } from "zod";

/**
 * Prompt v2 — Extração de planta com QUANTITATIVOS explícitos.
 *
 * Diferença vs v1:
 *   - Mantém todo o output do v1 (ambientes, elementos_especiais, etc).
 *   - Adiciona seção `quantitativos`: a IA agora CONTA explicitamente portas
 *     internas, portas externas, janelas grandes (sala/quartos/cozinha),
 *     janelas pequenas (banheiros/serviço), bacios, lavatórios, pias de
 *     cozinha, m² de revestimento de parede e m linear de rodapé.
 *
 * Por quê? v1 derivava esses números heuristicamente em lib/budget/rules/v3.ts
 * (contarPorTipo sobre ambientes). Funcionava razoavelmente, mas:
 *   - 1 porta por quarto + 1 por banheiro != quantidade real (suite tem 2)
 *   - Sem distinção entre janela panorâmica e janela maxi-ar
 *   - Sem prova/transparência pro arquiteto do que entrou no orçamento
 *
 * Com v2, o orçamento usa os números medidos pela IA quando presentes
 * (fallback automático pra heurística pra projetos antigos).
 *
 * v1 NUNCA é sobrescrito — orçamentos antigos continuam reproduzíveis.
 */

export const TIPOLOGIA = ["residencial", "comercial", "reforma", "outros"] as const;
export const PADRAO = ["popular", "medio", "alto", "luxo"] as const;

const AmbienteSchema = z.object({
  nome: z.string(),
  area_m2: z.number().positive().nullable(),
  tipo: z.enum([
    "sala",
    "cozinha",
    "quarto",
    "suite",
    "banheiro",
    "lavabo",
    "area_servico",
    "varanda",
    "garagem",
    "circulacao",
    "deposito",
    "escritorio",
    "outro",
  ]),
});

/**
 * Quantitativos contados pela IA. Cada campo é número não-negativo.
 *
 * Convenções (importante pra IA seguir):
 *   - portas_internas: contagem total das portas DENTRO da edificação,
 *     incluindo de quartos, suítes, banheiros, lavabos, escritórios, depósitos.
 *     Suite com porta de quarto + porta de banheiro conta 2.
 *   - portas_externas: porta principal de entrada + serviço + acesso a varandas
 *     externas (se houver). Geralmente 1-2.
 *   - janelas_grandes: janelas de sala/quartos/cozinha (>= 1.2m largura típica).
 *   - janelas_pequenas: maxi-ar/basculante de banheiros, lavabos e área de
 *     serviço (< 1.0m largura típica).
 *   - bacios: nº de vasos sanitários (1 por banheiro/lavabo).
 *   - lavatorios: nº de lavatórios (1 por banheiro/lavabo, eventualmente 2 em
 *     suítes premium).
 *   - pias_cozinha: nº de pias (1 por cozinha + 1 por área de serviço).
 *   - m_rodape: comprimento linear estimado em metros (≈ 0.9 × perímetro
 *     interno aprox; null se planta sem cotas).
 *   - m2_rev_parede: área de revestimento cerâmico de parede (parede de
 *     banheiro até teto + parede de pia em cozinha). Estimar conservadoramente.
 */
const QuantitativosSchema = z.object({
  portas_internas: z.number().int().nonnegative(),
  portas_externas: z.number().int().nonnegative(),
  janelas_grandes: z.number().int().nonnegative(),
  janelas_pequenas: z.number().int().nonnegative(),
  bacios: z.number().int().nonnegative(),
  lavatorios: z.number().int().nonnegative(),
  pias_cozinha: z.number().int().nonnegative(),
  m_rodape: z.number().nonnegative().nullable(),
  m2_rev_parede: z.number().nonnegative().nullable(),
});

export type Quantitativos = z.infer<typeof QuantitativosSchema>;

export const floorPlanExtractionSchema = z.object({
  area_total_m2: z.number().positive().nullable(),
  area_terreno_m2: z.number().positive().nullable(),
  ambientes: z.array(AmbienteSchema),
  numero_pavimentos: z.number().int().positive().nullable(),
  tipologia: z.enum(TIPOLOGIA),
  padrao_construtivo: z.enum(PADRAO).nullable(),
  elementos_especiais: z.object({
    piscina: z.boolean(),
    churrasqueira: z.boolean(),
    sacada: z.boolean(),
    garagem: z.boolean(),
    jardim: z.boolean(),
    area_servico_externa: z.boolean(),
  }),
  quantitativos: QuantitativosSchema,
  observacoes: z.string(),
  confianca: z.enum(["alta", "media", "baixa"]),
});

export type FloorPlanExtraction = z.infer<typeof floorPlanExtractionSchema>;

// =============================================================================
// System prompt — herda do v1 e estende a seção de quantitativos
// =============================================================================

export const SYSTEM_PROMPT = `Você é um especialista em leitura de plantas baixas arquitetônicas brasileiras.

Sua tarefa: receber um PDF com planta(s) baixa(s) e extrair dados estruturados que alimentarão um orçamento SINAPI e a geração automática de memorial descritivo, caderno técnico e proposta comercial.

REGRAS:
1. Trabalhe primariamente com o que está visível na planta. Não invente cotas detalhadas.
2. Para "padrão construtivo", infira pelo nível de acabamento aparente:
   - popular: até ~50m², acabamentos básicos, sem detalhamento de revestimentos especiais
   - médio: 50-200m², materiais comuns, garagem simples, área de serviço básica
   - alto: 200-400m², múltiplas suítes, áreas de lazer, garagem para 2+ carros, churrasqueira
   - luxo: 400m²+, piscina, suítes com closet, área gourmet completa, acabamentos premium
3. Para "tipologia", priorize evidências da planta. Reforma só se o PDF indicar explicitamente "demolir/manter/construir" ou layout de "existente x proposto".
4. Liste TODOS os ambientes identificados (use seus nomes corretos quando indicados — quitinete, sala, cozinha, etc), não só os principais.

📐 ÁREA TOTAL — REGRA ESPECIAL (CRÍTICA):
\`area_total_m2\` é OBRIGATÓRIA porque alimenta todo o orçamento. Mesmo que o PDF não tenha cotas claras ou área total escrita:
   a) Se há cota total ou tabela de áreas → use o valor exato e marque confianca='alta'.
   b) Se não há cota total mas há cotas parciais → some os ambientes e marque confianca='media'.
   c) Se NÃO há cotas legíveis → ESTIME a partir da escala/proporção visual da planta + número e tipo de ambientes identificados (ex.: 1 quitinete simples ~25m², 4 quitinetes lado-a-lado ~100m², casa térrea com 3 quartos ~120m²). Marque confianca='baixa' e descreva o raciocínio em \`observacoes\`.
   d) NÃO retorne null em area_total_m2 — sempre devolva um número.

📐 ÁREAS POR AMBIENTE (\`area_m2\` em \`ambientes[]\`):
   - Se a cota está visível: use o valor exato.
   - Se não está: retorne null (mais conservador aqui, pois alimenta NBR checks).

🔍 ELEMENTOS ESPECIAIS:
   - false explícito quando claramente ausente (ex.: planta sem piscina = false)
   - true só se evidência visual clara

📊 QUANTITATIVOS — NOVO no v2 (CRÍTICO pro orçamento):
Conte EXPLICITAMENTE os itens construtivos abaixo. Esses números entram direto no
orçamento SINAPI — então seja consistente com o que ambientes/elementos especiais
indicam:

   • portas_internas: TODAS as portas dentro da edificação. Inclui:
     1 por quarto/suíte (entrada do quarto) + 1 por banheiro/lavabo + 1 por
     escritório + 1 por depósito. Suíte com banheiro privativo = 2 portas
     (uma do quarto + uma do banheiro).
   • portas_externas: porta principal de entrada + porta de serviço (se houver
     área de serviço com saída) + porta de acesso a varanda externa.
     Geralmente 1-2 unidades; raramente >3.
   • janelas_grandes: janelas de SALA, QUARTO, SUÍTE, COZINHA — qualquer
     janela com largura ≥ 1.2m ou que ocupa fração relevante da parede.
   • janelas_pequenas: BASCULANTES e MAXI-AR de BANHEIROS, LAVABOS, ÁREA DE
     SERVIÇO. Largura < 1.0m típica.
   • bacios (vasos sanitários): 1 por banheiro + 1 por lavabo.
   • lavatorios: 1 por banheiro + 1 por lavabo. Suítes premium podem ter 2
     no banheiro — conte conforme a planta.
   • pias_cozinha: 1 por cozinha + 1 por área de serviço com tanque/pia.
   • m_rodape: comprimento linear estimado em metros. Heurística:
     0.9 × perímetro interno aproximado dos ambientes. Se a planta não tiver
     cotas suficientes, retorne null.
   • m2_rev_parede: área de revestimento cerâmico de parede em m². Estimar:
     banheiros completos = parede inteira até teto (~25m² por banheiro
     padrão); cozinha = só parede da pia (~15m² típico). Some por ambiente.
     null se não tiver como inferir.

Use 0 quando o item simplesmente não existe (ex: kitnet sem cozinha separada =
pias_cozinha 0). Use null SOMENTE em m_rodape e m2_rev_parede quando incerteza
é alta.

📋 OBSERVAÇÕES:
   Em \`observacoes\` descreva o que ficou incerto (área estimada por escala, padrão inferido por contexto, quantitativos imprecisos por planta sem cotas etc) pra o profissional revisar.

VOCÊ DEVE invocar a tool "record_floor_plan_extraction" com os dados extraídos. Não responda em texto livre — apenas chame a tool.`;

// =============================================================================
// Tool definition — JSON Schema mirror do zod schema
// =============================================================================

export const TOOL_NAME = "record_floor_plan_extraction" as const;

export const TOOL_DEFINITION: {
  name: typeof TOOL_NAME;
  description: string;
  input_schema: Record<string, unknown> & { type: "object" };
} = {
  name: TOOL_NAME,
  description:
    "Registra os dados extraídos da planta baixa. Sempre invoque esta ferramenta após analisar o PDF — esta é a única forma de retornar a resposta.",
  input_schema: {
    type: "object",
    properties: {
      area_total_m2: { type: ["number", "null"] },
      area_terreno_m2: { type: ["number", "null"] },
      ambientes: {
        type: "array",
        items: {
          type: "object",
          properties: {
            nome: { type: "string" },
            area_m2: { type: ["number", "null"] },
            tipo: {
              type: "string",
              enum: [
                "sala",
                "cozinha",
                "quarto",
                "suite",
                "banheiro",
                "lavabo",
                "area_servico",
                "varanda",
                "garagem",
                "circulacao",
                "deposito",
                "escritorio",
                "outro",
              ],
            },
          },
          required: ["nome", "area_m2", "tipo"],
        },
      },
      numero_pavimentos: { type: ["integer", "null"] },
      tipologia: { type: "string", enum: TIPOLOGIA },
      padrao_construtivo: { type: ["string", "null"], enum: [...PADRAO, null] },
      elementos_especiais: {
        type: "object",
        properties: {
          piscina: { type: "boolean" },
          churrasqueira: { type: "boolean" },
          sacada: { type: "boolean" },
          garagem: { type: "boolean" },
          jardim: { type: "boolean" },
          area_servico_externa: { type: "boolean" },
        },
        required: [
          "piscina",
          "churrasqueira",
          "sacada",
          "garagem",
          "jardim",
          "area_servico_externa",
        ],
      },
      quantitativos: {
        type: "object",
        description:
          "Contagem explícita de elementos construtivos pra alimentar o orçamento SINAPI.",
        properties: {
          portas_internas: { type: "integer", minimum: 0 },
          portas_externas: { type: "integer", minimum: 0 },
          janelas_grandes: { type: "integer", minimum: 0 },
          janelas_pequenas: { type: "integer", minimum: 0 },
          bacios: { type: "integer", minimum: 0 },
          lavatorios: { type: "integer", minimum: 0 },
          pias_cozinha: { type: "integer", minimum: 0 },
          m_rodape: {
            type: ["number", "null"],
            minimum: 0,
            description: "Metros lineares de rodapé. null se planta sem cotas.",
          },
          m2_rev_parede: {
            type: ["number", "null"],
            minimum: 0,
            description: "m² de revestimento cerâmico de parede. null se incerto.",
          },
        },
        required: [
          "portas_internas",
          "portas_externas",
          "janelas_grandes",
          "janelas_pequenas",
          "bacios",
          "lavatorios",
          "pias_cozinha",
          "m_rodape",
          "m2_rev_parede",
        ],
      },
      observacoes: { type: "string" },
      confianca: { type: "string", enum: ["alta", "media", "baixa"] },
    },
    required: [
      "area_total_m2",
      "area_terreno_m2",
      "ambientes",
      "numero_pavimentos",
      "tipologia",
      "padrao_construtivo",
      "elementos_especiais",
      "quantitativos",
      "observacoes",
      "confianca",
    ],
  },
} as const;

export const PROMPT_VERSION = "extract-floor-plan.v2";
