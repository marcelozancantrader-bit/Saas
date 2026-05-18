import { z } from "zod";
import {
  CONFIANCA,
  PONTO_AMBIENTE_JSON_SCHEMA,
  pontoAmbienteSchema,
} from "./_shared-extraction-schema";

/**
 * Prompt v1 — Extrair projeto HVAC/climatização de PDF (Sprint 9).
 *
 * Extrai: tipo de sistema, pontos de AC por ambiente com capacidade em BTU,
 * dutos, exaustão. Não tem SINAPI direto — referência de mercado para orçamento.
 *
 * NUNCA sobrescrever este arquivo.
 */

const SISTEMA_AC = [
  "split_hi_wall",
  "cassete",
  "piso_teto",
  "vrf",
  "central_dutado",
  "janela",
  "misto",
  "indefinido",
] as const;

const splitSchema = z.object({
  ambiente: z.string().min(1).max(120),
  capacidade_btu: z
    .number()
    .int()
    .positive()
    .nullable()
    .describe("Capacidade em BTU/h (típicos: 9000/12000/18000/24000/30000). null se ilegível."),
});

export const hvacExtractionSchema = z.object({
  sistema: z.enum(SISTEMA_AC),
  splits_por_ambiente: z.array(splitSchema).describe("Cada split/evaporadora cotada na planta"),
  pontos_exaustao_por_ambiente: z
    .array(pontoAmbienteSchema)
    .describe("Pontos de exaustão mecânica (banheiros, cozinha, lavanderia)"),
  total_splits: z.number().int().nonnegative().nullable(),
  capacidade_total_btu: z
    .number()
    .int()
    .positive()
    .nullable()
    .describe("Soma de BTUs de todos os splits cotados"),
  duto_metros: z
    .number()
    .nonnegative()
    .nullable()
    .describe("Comprimento de dutos (só central dutado/VRF). null se split direto."),
  observacoes: z.string().max(500),
  confianca: z.enum(CONFIANCA),
});

export type HvacExtraction = z.infer<typeof hvacExtractionSchema>;

export const SYSTEM_PROMPT = `Você é um especialista em projetos de climatização (NBR 16401, ABNT 5410 para ramal elétrico).

Sua tarefa: extrair dados do PDF para orçamento (splits, dutos, exaustão).

REGRAS:
1. Capacidade em BTU/h: extraia o valor literal da legenda. Se o projeto só disser "split", retorne null.
2. Pontos de exaustão: ventiladores axiais/centrífugos em banheiros sem janela, cozinhas, lavanderias.
3. Dutos: só preencha duto_metros se for sistema central dutado. Split hi-wall não tem dutos.
4. Não há composições SINAPI diretas — informativo pro orçamento de referência.
5. Se ilegível, confianca="baixa" + nulls.

VOCÊ DEVE invocar a tool "record_hvac_extraction".`;

export const TOOL_NAME = "record_hvac_extraction" as const;

export const TOOL_DEFINITION: {
  name: typeof TOOL_NAME;
  description: string;
  input_schema: Record<string, unknown> & { type: "object" };
} = {
  name: TOOL_NAME,
  description:
    "Registra os dados extraídos do projeto de climatização. Sempre invoque após analisar o PDF.",
  input_schema: {
    type: "object",
    properties: {
      sistema: { type: "string", enum: [...SISTEMA_AC] },
      splits_por_ambiente: {
        type: "array",
        items: {
          type: "object",
          properties: {
            ambiente: { type: "string" },
            capacidade_btu: { type: ["integer", "null"] },
          },
          required: ["ambiente", "capacidade_btu"],
        },
      },
      pontos_exaustao_por_ambiente: { type: "array", items: PONTO_AMBIENTE_JSON_SCHEMA },
      total_splits: { type: ["integer", "null"], minimum: 0 },
      capacidade_total_btu: { type: ["integer", "null"] },
      duto_metros: { type: ["number", "null"] },
      observacoes: { type: "string", maxLength: 500 },
      confianca: { type: "string", enum: [...CONFIANCA] },
    },
    required: [
      "sistema",
      "splits_por_ambiente",
      "pontos_exaustao_por_ambiente",
      "total_splits",
      "capacidade_total_btu",
      "duto_metros",
      "observacoes",
      "confianca",
    ],
  },
} as const;

export const PROMPT_VERSION = "extract-hvac.v1";
