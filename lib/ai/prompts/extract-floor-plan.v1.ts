import { z } from "zod";

/**
 * Prompt v1 — Extract structured data from architectural floor plan PDFs.
 *
 * Approach:
 *   - Pass the PDF natively via `document` content block (Claude Sonnet 4.6 reads PDFs directly,
 *     no rasterization needed).
 *   - Force structured output via tool_use with strict input schema. Claude must invoke the
 *     `record_floor_plan_extraction` tool — that becomes our parsed result.
 *   - System prompt + tool definition are static → cacheable.
 *
 * If you need to change the schema or instructions, create extract-floor-plan.v2.ts. NEVER
 * overwrite this file (CLAUDE.md rule).
 */

// =============================================================================
// Zod schema for the extraction result (also used to derive JSON Schema)
// =============================================================================

export const TIPOLOGIA = ["residencial", "comercial", "reforma", "outros"] as const;
export const PADRAO = ["popular", "medio", "alto", "luxo"] as const;

const AmbienteSchema = z.object({
  nome: z.string().describe("Nome do ambiente, ex: 'Sala de estar', 'Suíte 1', 'Cozinha'"),
  area_m2: z
    .number()
    .positive()
    .nullable()
    .describe("Área em m² se a planta cotar; null se não estiver legível"),
  tipo: z
    .enum([
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
    ])
    .describe("Categoria do ambiente (use 'outro' se não souber classificar)"),
});

export const floorPlanExtractionSchema = z.object({
  area_total_m2: z
    .number()
    .positive()
    .nullable()
    .describe(
      "Área total construída em m². Some as áreas dos ambientes principais. null se a planta não trouxer informação suficiente.",
    ),
  area_terreno_m2: z
    .number()
    .positive()
    .nullable()
    .describe(
      "Área do terreno em m² (se aparecer na planta — geralmente em planta de implantação). null se não informado.",
    ),
  ambientes: z.array(AmbienteSchema).describe("Lista de ambientes identificados na planta"),
  numero_pavimentos: z
    .number()
    .int()
    .positive()
    .nullable()
    .describe(
      "Número de pavimentos/níveis (térreo + superiores). null se não conseguir determinar.",
    ),
  tipologia: z
    .enum(TIPOLOGIA)
    .describe(
      "Tipologia do imóvel: 'residencial' = casa/apto residencial, 'comercial' = sala/loja/galpão, 'reforma' = projeto de reforma sobre construção existente, 'outros' = institucional/industrial.",
    ),
  padrao_construtivo: z
    .enum(PADRAO)
    .nullable()
    .describe(
      "Padrão construtivo inferido pelo nível de acabamento aparente. null se não conseguir inferir com confiança.",
    ),
  elementos_especiais: z
    .object({
      piscina: z.boolean().describe("Há piscina na planta?"),
      churrasqueira: z.boolean().describe("Há área de churrasqueira/gourmet?"),
      sacada: z.boolean().describe("Há sacada/varanda externa?"),
      garagem: z.boolean().describe("Há garagem/vaga coberta?"),
      jardim: z.boolean().describe("Há área de jardim/quintal?"),
      area_servico_externa: z.boolean().describe("Há área de serviço externa coberta?"),
    })
    .describe(
      "Elementos especiais identificados — todos os campos são obrigatórios (true ou false)",
    ),
  observacoes: z
    .string()
    .describe(
      "Observações relevantes para o profissional (ex: 'planta sem cotas', 'estilo arquitetônico contemporâneo', 'projeto de reforma com ampliação'). Máximo ~300 caracteres.",
    ),
  confianca: z
    .enum(["alta", "media", "baixa"])
    .describe(
      "Sua confiança nos dados extraídos. 'baixa' se a planta estiver ilegível, mal cotada ou parcial.",
    ),
});

export type FloorPlanExtraction = z.infer<typeof floorPlanExtractionSchema>;

// =============================================================================
// System prompt (cacheable, static)
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

📋 OBSERVAÇÕES:
   Em \`observacoes\` descreva o que ficou incerto (área estimada por escala, padrão inferido por contexto, etc) pra o profissional revisar.

VOCÊ DEVE invocar a tool "record_floor_plan_extraction" com os dados extraídos. Não responda em texto livre — apenas chame a tool.`;

// =============================================================================
// Tool definition for structured output via tool_use
// =============================================================================

export const TOOL_NAME = "record_floor_plan_extraction" as const;

// Anthropic SDK's Tool type wants mutable arrays. We define this without `as const`
// at the top level (only the literal values inside) so the SDK is happy.
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
      area_total_m2: {
        type: ["number", "null"],
        description: "Área total construída em m². null se não conseguir determinar.",
      },
      area_terreno_m2: {
        type: ["number", "null"],
        description: "Área do terreno em m². null se não informado na planta.",
      },
      ambientes: {
        type: "array",
        description: "Lista de ambientes identificados",
        items: {
          type: "object",
          properties: {
            nome: { type: "string", description: "Nome do ambiente" },
            area_m2: { type: ["number", "null"], description: "Área em m², null se não cotado" },
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
      numero_pavimentos: {
        type: ["integer", "null"],
        description: "Número de pavimentos. null se não conseguir determinar.",
      },
      tipologia: {
        type: "string",
        enum: TIPOLOGIA,
        description: "Tipologia do imóvel",
      },
      padrao_construtivo: {
        type: ["string", "null"],
        enum: [...PADRAO, null],
        description: "Padrão construtivo inferido. null se incerto.",
      },
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
      observacoes: {
        type: "string",
        description: "Observações relevantes. Máximo ~300 caracteres.",
      },
      confianca: {
        type: "string",
        enum: ["alta", "media", "baixa"],
        description: "Sua confiança nos dados extraídos.",
      },
    },
    required: [
      "area_total_m2",
      "area_terreno_m2",
      "ambientes",
      "numero_pavimentos",
      "tipologia",
      "padrao_construtivo",
      "elementos_especiais",
      "observacoes",
      "confianca",
    ],
  },
} as const;

export const PROMPT_VERSION = "extract-floor-plan.v1";
