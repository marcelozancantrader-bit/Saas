import { z } from "zod";
import { CONFIANCA } from "./_shared-extraction-schema";

/**
 * Prompt v1 — Extrair projeto estrutural de PDF (Sprint 9).
 *
 * Extrai: tipo de fundação, pilares (qtd + seção), vigas (qtd + seção), lajes,
 * fck nominal, volume de concreto e taxa de aço estimados.
 *
 * NUNCA sobrescrever este arquivo.
 */

const FUNDACAO_TIPOS = [
  "sapata_corrida",
  "sapata_isolada",
  "radier",
  "estaca",
  "tubulao",
  "bloco_coroamento",
  "indefinido",
] as const;

const SISTEMA_ESTRUTURAL = [
  "concreto_armado",
  "alvenaria_estrutural",
  "estrutura_metalica",
  "madeira",
  "misto",
  "indefinido",
] as const;

const elementoSchema = z.object({
  quantidade: z.number().int().nonnegative().nullable().describe("Quantidade de elementos"),
  secao_cm: z
    .string()
    .max(60)
    .nullable()
    .describe("Seção típica em cm, ex: '20x30' ou 'h=15'. null se variar muito."),
});

export const structuralExtractionSchema = z.object({
  sistema_estrutural: z.enum(SISTEMA_ESTRUTURAL),
  fundacao: z.object({
    tipo: z.enum(FUNDACAO_TIPOS),
    profundidade_m: z
      .number()
      .positive()
      .nullable()
      .describe("Profundidade típica em metros. null se ilegível."),
  }),
  fck_mpa: z
    .number()
    .positive()
    .nullable()
    .describe("Resistência do concreto em MPa (20/25/30/35...). null se ilegível."),
  pilares: elementoSchema,
  vigas: elementoSchema,
  lajes: z.object({
    quantidade_pavimentos_com_laje: z.number().int().nonnegative().nullable(),
    tipo: z
      .enum(["macica", "nervurada", "pre_moldada", "steel_deck", "mista", "indefinido"])
      .describe("Tipo predominante de laje"),
    espessura_cm: z.number().positive().nullable(),
  }),
  volume_concreto_m3: z
    .number()
    .positive()
    .nullable()
    .describe("Volume total estimado de concreto estrutural. null se não conseguir estimar."),
  aco_kg_total: z
    .number()
    .positive()
    .nullable()
    .describe("Massa total estimada de aço CA-50 + CA-60. null se não estimar."),
  observacoes: z.string().max(2000),
  confianca: z.enum(CONFIANCA),
});

export type StructuralExtraction = z.infer<typeof structuralExtractionSchema>;

export const SYSTEM_PROMPT = `Você é um especialista em projetos estruturais brasileiros (NBR 6118/6120/8681).

Sua tarefa: extrair dados do PDF que alimentarão o orçamento SINAPI (composições 92478 de
concreto fck=25, 92797 de aço CA-50, formas).

REGRAS:
1. Trabalhe SÓ com o que está na planta de formas/armação/locação.
2. Para "seção_cm" use o formato literal: "20x30", "20x40", "h=12". Se variar muito por nível, retorne null.
3. Para volume de concreto: some grosseiramente vigas+pilares+lajes se a planta cotar as dimensões. Senão null.
4. Para massa de aço: use taxa SINAPI típica 80-100 kg/m³ se você estimou o volume — caso contrário null.
5. "Indefinido" é resposta válida quando o projeto não deixa explícito.
6. Se ilegível, confianca="baixa" + nulls.

VOCÊ DEVE invocar a tool "record_structural_extraction".`;

export const TOOL_NAME = "record_structural_extraction" as const;

const ELEMENTO_JSON_SCHEMA = {
  type: "object",
  properties: {
    quantidade: { type: ["integer", "null"], minimum: 0 },
    secao_cm: { type: ["string", "null"], maxLength: 60 },
  },
  required: ["quantidade", "secao_cm"],
} as const;

export const TOOL_DEFINITION: {
  name: typeof TOOL_NAME;
  description: string;
  input_schema: Record<string, unknown> & { type: "object" };
} = {
  name: TOOL_NAME,
  description:
    "Registra os dados extraídos do projeto estrutural. Sempre invoque após analisar o PDF.",
  input_schema: {
    type: "object",
    properties: {
      sistema_estrutural: { type: "string", enum: [...SISTEMA_ESTRUTURAL] },
      fundacao: {
        type: "object",
        properties: {
          tipo: { type: "string", enum: [...FUNDACAO_TIPOS] },
          profundidade_m: { type: ["number", "null"] },
        },
        required: ["tipo", "profundidade_m"],
      },
      fck_mpa: { type: ["number", "null"] },
      pilares: ELEMENTO_JSON_SCHEMA,
      vigas: ELEMENTO_JSON_SCHEMA,
      lajes: {
        type: "object",
        properties: {
          quantidade_pavimentos_com_laje: { type: ["integer", "null"], minimum: 0 },
          tipo: {
            type: "string",
            enum: ["macica", "nervurada", "pre_moldada", "steel_deck", "mista", "indefinido"],
          },
          espessura_cm: { type: ["number", "null"] },
        },
        required: ["quantidade_pavimentos_com_laje", "tipo", "espessura_cm"],
      },
      volume_concreto_m3: { type: ["number", "null"] },
      aco_kg_total: { type: ["number", "null"] },
      observacoes: { type: "string", maxLength: 2000 },
      confianca: { type: "string", enum: [...CONFIANCA] },
    },
    required: [
      "sistema_estrutural",
      "fundacao",
      "fck_mpa",
      "pilares",
      "vigas",
      "lajes",
      "volume_concreto_m3",
      "aco_kg_total",
      "observacoes",
      "confianca",
    ],
  },
} as const;

export const PROMPT_VERSION = "extract-structural.v1";
