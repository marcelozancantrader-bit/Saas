import { z } from "zod";
import {
  CONFIANCA,
  PONTO_AMBIENTE_JSON_SCHEMA,
  pontoAmbienteSchema,
} from "./_shared-extraction-schema";

/**
 * Prompt v1 — Extrair projeto de gás de PDF (Sprint 9).
 *
 * Extrai: pontos de gás por ambiente, comprimento de tubulação, tipo (GLP/GN),
 * dados do abrigo de cilindros (ou ramal de rua), registros.
 *
 * NUNCA sobrescrever este arquivo.
 */

const TIPO_GAS = ["glp", "gn", "indefinido"] as const;

export const gasExtractionSchema = z.object({
  tipo: z.enum(TIPO_GAS).describe("GLP (botijão/cilindro) ou GN (gás natural de rua)"),
  pontos_por_ambiente: z
    .array(pontoAmbienteSchema)
    .describe("Pontos de consumo por ambiente (fogão, aquecedor, secadora...)"),
  total_pontos: z.number().int().nonnegative().nullable(),
  tubulacao_cobre_metros: z
    .number()
    .nonnegative()
    .nullable()
    .describe(
      "Comprimento estimado de tubulação de cobre/multicamada em metros. null se sem cota.",
    ),
  registros: z
    .number()
    .int()
    .nonnegative()
    .nullable()
    .describe("Total de registros (corte + esfera)"),
  central_glp: z
    .object({
      tem_central: z
        .boolean()
        .describe("Há central de GLP (abrigo + cilindros P45/P90)? Só relevante para tipo=glp"),
      capacidade_kg: z
        .number()
        .positive()
        .nullable()
        .describe("Capacidade total em kg de GLP (P13=13, P45=45, P90=90)"),
      qtd_cilindros: z.number().int().positive().nullable(),
    })
    .describe("Dados da central de GLP — só preenche se tipo=glp"),
  observacoes: z.string().max(500),
  confianca: z.enum(CONFIANCA),
});

export type GasExtraction = z.infer<typeof gasExtractionSchema>;

export const SYSTEM_PROMPT = `Você é um especialista em projetos de gás combustível (NBR 13103/15526).

Sua tarefa: extrair dados do PDF para orçamento (cobre flexível, registros, central de GLP).

REGRAS:
1. Tipo: GLP em residências costuma usar P13 (uso doméstico simples) ou central P45/P90 com mais de 2 pontos. GN = ramal de concessionária.
2. Pontos de consumo típicos: fogão, cooktop, forno, aquecedor de passagem/acumulação, secadora de roupas, churrasqueira a gás.
3. Tubulação: só estime se a planta isométrica tiver cotas. Senão null.
4. Se tipo=gn, central_glp.tem_central=false e capacidade/qtd=null.
5. Se ilegível, confianca="baixa" + nulls.

VOCÊ DEVE invocar a tool "record_gas_extraction".`;

export const TOOL_NAME = "record_gas_extraction" as const;

export const TOOL_DEFINITION: {
  name: typeof TOOL_NAME;
  description: string;
  input_schema: Record<string, unknown> & { type: "object" };
} = {
  name: TOOL_NAME,
  description: "Registra os dados extraídos do projeto de gás. Sempre invoque após analisar o PDF.",
  input_schema: {
    type: "object",
    properties: {
      tipo: { type: "string", enum: [...TIPO_GAS] },
      pontos_por_ambiente: { type: "array", items: PONTO_AMBIENTE_JSON_SCHEMA },
      total_pontos: { type: ["integer", "null"], minimum: 0 },
      tubulacao_cobre_metros: { type: ["number", "null"] },
      registros: { type: ["integer", "null"], minimum: 0 },
      central_glp: {
        type: "object",
        properties: {
          tem_central: { type: "boolean" },
          capacidade_kg: { type: ["number", "null"] },
          qtd_cilindros: { type: ["integer", "null"], minimum: 1 },
        },
        required: ["tem_central", "capacidade_kg", "qtd_cilindros"],
      },
      observacoes: { type: "string", maxLength: 500 },
      confianca: { type: "string", enum: [...CONFIANCA] },
    },
    required: [
      "tipo",
      "pontos_por_ambiente",
      "total_pontos",
      "tubulacao_cobre_metros",
      "registros",
      "central_glp",
      "observacoes",
      "confianca",
    ],
  },
} as const;

export const PROMPT_VERSION = "extract-gas.v1";
