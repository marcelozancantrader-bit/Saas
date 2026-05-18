import { z } from "zod";
import {
  CONFIANCA,
  PONTO_AMBIENTE_JSON_SCHEMA,
  pontoAmbienteSchema,
} from "./_shared-extraction-schema";

/**
 * Prompt v1 — Extrair projeto elétrico de PDF (Sprint 9).
 *
 * Extrai: pontos por ambiente (tomadas/interruptores/iluminação), circuitos,
 * dados do quadro de distribuição, bitolas estimadas.
 *
 * NUNCA sobrescrever este arquivo — criar v2.ts se precisar mudar schema.
 */

const CIRCUITO_TIPOS = [
  "iluminacao",
  "tomadas_uso_geral",
  "tomadas_uso_especifico",
  "ar_condicionado",
  "chuveiro",
  "forno_cooktop",
] as const;

const circuitoSchema = z.object({
  tipo: z.enum(CIRCUITO_TIPOS).describe("Categoria do circuito"),
  quantidade: z.number().int().positive().describe("Quantas vezes esse circuito aparece"),
  bitola_mm2: z
    .number()
    .positive()
    .nullable()
    .describe("Seção do condutor em mm² (1.5, 2.5, 4, 6, 10...). null se ilegível."),
});

export const electricalExtractionSchema = z.object({
  pontos_por_ambiente: z
    .array(pontoAmbienteSchema)
    .describe("Quantidade total de pontos elétricos (tomadas+interruptores+ilum.) por ambiente"),
  total_tomadas: z
    .number()
    .int()
    .nonnegative()
    .nullable()
    .describe("Total de tomadas no projeto. null se não conseguir contar."),
  total_interruptores: z
    .number()
    .int()
    .nonnegative()
    .nullable()
    .describe("Total de interruptores. null se não conseguir contar."),
  total_luminarias: z
    .number()
    .int()
    .nonnegative()
    .nullable()
    .describe("Total de pontos de luminária/iluminação no teto."),
  circuitos: z.array(circuitoSchema).describe("Circuitos identificados no quadro"),
  quadro_distribuicao: z.object({
    quantidade: z
      .number()
      .int()
      .positive()
      .nullable()
      .describe("Quantos QDs (quadros de distribuição) o projeto tem. null se ilegível."),
    disjuntores_total: z
      .number()
      .int()
      .nonnegative()
      .nullable()
      .describe("Total de disjuntores somando todos os QDs."),
    tem_dps: z.boolean().describe("Há DPS (proteção contra surto)?"),
    tem_dr: z.boolean().describe("Há DR (proteção residual)?"),
  }),
  observacoes: z
    .string()
    .max(2000)
    .describe("Observações relevantes pro profissional. Máx 2000 chars."),
  confianca: z.enum(CONFIANCA).describe("Confiança geral na extração"),
});

export type ElectricalExtraction = z.infer<typeof electricalExtractionSchema>;

export const SYSTEM_PROMPT = `Você é um especialista em projetos elétricos prediais brasileiros (NBR 5410/5419).

Sua tarefa: receber um PDF de projeto elétrico e extrair dados estruturados que alimentarão
o orçamento SINAPI (composições 91931/91933/91929 de cabos, tomadas, disjuntores).

REGRAS:
1. Conte SÓ o que está visível na planta. Não invente.
2. Pontos = tomadas + interruptores + pontos de luminária (símbolos elétricos típicos).
3. Para bitolas, use os valores literais do projeto. Se a legenda só disser "tomada", retorne null.
4. Quadro de distribuição: se houver mais de um (QGBT + QDs), some os disjuntores totais.
5. Se a planta estiver ilegível, marque confianca="baixa" e use null nos campos numéricos.
6. NUNCA estime — null é resposta válida.

VOCÊ DEVE invocar a tool "record_electrical_extraction" — não responda em texto livre.`;

export const TOOL_NAME = "record_electrical_extraction" as const;

export const TOOL_DEFINITION: {
  name: typeof TOOL_NAME;
  description: string;
  input_schema: Record<string, unknown> & { type: "object" };
} = {
  name: TOOL_NAME,
  description:
    "Registra os dados extraídos do projeto elétrico. Sempre invoque após analisar o PDF.",
  input_schema: {
    type: "object",
    properties: {
      pontos_por_ambiente: {
        type: "array",
        items: PONTO_AMBIENTE_JSON_SCHEMA,
        description: "Pontos elétricos contados por ambiente",
      },
      total_tomadas: { type: ["integer", "null"], minimum: 0 },
      total_interruptores: { type: ["integer", "null"], minimum: 0 },
      total_luminarias: { type: ["integer", "null"], minimum: 0 },
      circuitos: {
        type: "array",
        items: {
          type: "object",
          properties: {
            tipo: { type: "string", enum: [...CIRCUITO_TIPOS] },
            quantidade: { type: "integer", minimum: 1 },
            bitola_mm2: { type: ["number", "null"] },
          },
          required: ["tipo", "quantidade", "bitola_mm2"],
        },
      },
      quadro_distribuicao: {
        type: "object",
        properties: {
          quantidade: { type: ["integer", "null"], minimum: 1 },
          disjuntores_total: { type: ["integer", "null"], minimum: 0 },
          tem_dps: { type: "boolean" },
          tem_dr: { type: "boolean" },
        },
        required: ["quantidade", "disjuntores_total", "tem_dps", "tem_dr"],
      },
      observacoes: { type: "string", maxLength: 2000 },
      confianca: { type: "string", enum: [...CONFIANCA] },
    },
    required: [
      "pontos_por_ambiente",
      "total_tomadas",
      "total_interruptores",
      "total_luminarias",
      "circuitos",
      "quadro_distribuicao",
      "observacoes",
      "confianca",
    ],
  },
} as const;

export const PROMPT_VERSION = "extract-electrical.v1";
