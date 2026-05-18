import { z } from "zod";
import {
  CONFIANCA,
  PONTO_AMBIENTE_JSON_SCHEMA,
  pontoAmbienteSchema,
} from "./_shared-extraction-schema";

/**
 * Prompt v1 — Extrair projeto hidrossanitário de PDF (Sprint 9).
 *
 * Extrai: pontos de água fria/quente/esgoto por ambiente, ralos, reservatório,
 * fossa séptica/sumidouro, comprimento estimado de tubulação.
 *
 * NUNCA sobrescrever este arquivo.
 */

export const hydraulicExtractionSchema = z.object({
  pontos_agua_fria_por_ambiente: z
    .array(pontoAmbienteSchema)
    .describe("Pontos de água fria por ambiente"),
  pontos_agua_quente_por_ambiente: z
    .array(pontoAmbienteSchema)
    .describe("Pontos de água quente por ambiente"),
  pontos_esgoto_por_ambiente: z
    .array(pontoAmbienteSchema)
    .describe("Pontos de esgoto sanitário por ambiente"),
  total_pontos_agua_fria: z.number().int().nonnegative().nullable(),
  total_pontos_agua_quente: z.number().int().nonnegative().nullable(),
  total_pontos_esgoto: z.number().int().nonnegative().nullable(),
  total_ralos: z
    .number()
    .int()
    .nonnegative()
    .nullable()
    .describe("Ralos sifonados + ralos secos em todo o projeto"),
  reservatorio: z.object({
    capacidade_l: z
      .number()
      .positive()
      .nullable()
      .describe("Capacidade da caixa d'água em litros. null se não cotada."),
    elevado: z.boolean().describe("Reservatório elevado (laje/torre)?"),
    inferior: z.boolean().describe("Há reservatório inferior/cisterna?"),
  }),
  tratamento_esgoto: z.object({
    tem_fossa_septica: z.boolean(),
    tem_sumidouro: z.boolean(),
    tem_filtro_anaerobio: z.boolean(),
    capacidade_l: z
      .number()
      .positive()
      .nullable()
      .describe("Capacidade da fossa em litros. null se não cotada."),
  }),
  tubulacao_estimada: z.object({
    pvc_25mm_metros: z
      .number()
      .nonnegative()
      .nullable()
      .describe("Estimativa de PVC 25mm (água fria ramal). null se não conseguir estimar."),
    pvc_32mm_metros: z.number().nonnegative().nullable().describe("PVC 32mm (água fria coluna)"),
    pvc_50mm_metros: z.number().nonnegative().nullable().describe("PVC 50mm (esgoto secundário)"),
    pvc_100mm_metros: z.number().nonnegative().nullable().describe("PVC 100mm (esgoto primário)"),
  }),
  observacoes: z.string().max(500),
  confianca: z.enum(CONFIANCA),
});

export type HydraulicExtraction = z.infer<typeof hydraulicExtractionSchema>;

export const SYSTEM_PROMPT = `Você é um especialista em projetos hidrossanitários brasileiros (NBR 5626/8160/7229).

Sua tarefa: extrair dados do PDF que alimentarão o orçamento SINAPI (composições 89711, 89714,
89732 de tubos PVC, registros, caixas d'água, fossa séptica).

REGRAS:
1. Conte SÓ o visível. Não invente comprimentos sem cota.
2. "Ponto de água fria" = saída individual (torneira, registro, válvula, descarga, ducha higiênica, chuveiro).
3. "Ponto de esgoto" = vaso + lavatório + chuveiro + tanque + pia + máquina = ralos NÃO contam aqui.
4. Para tubulação estimada: se você consegue medir a planta hidráulica isométrica, retorne em metros. Senão null.
5. Reservatório: cisterna + caixa elevada são DOIS reservatórios — marque os dois booleanos quando ambos existem.
6. Se ilegível, confianca="baixa" + null.

VOCÊ DEVE invocar a tool "record_hydraulic_extraction".`;

export const TOOL_NAME = "record_hydraulic_extraction" as const;

export const TOOL_DEFINITION: {
  name: typeof TOOL_NAME;
  description: string;
  input_schema: Record<string, unknown> & { type: "object" };
} = {
  name: TOOL_NAME,
  description:
    "Registra os dados extraídos do projeto hidrossanitário. Sempre invoque após analisar o PDF.",
  input_schema: {
    type: "object",
    properties: {
      pontos_agua_fria_por_ambiente: { type: "array", items: PONTO_AMBIENTE_JSON_SCHEMA },
      pontos_agua_quente_por_ambiente: { type: "array", items: PONTO_AMBIENTE_JSON_SCHEMA },
      pontos_esgoto_por_ambiente: { type: "array", items: PONTO_AMBIENTE_JSON_SCHEMA },
      total_pontos_agua_fria: { type: ["integer", "null"], minimum: 0 },
      total_pontos_agua_quente: { type: ["integer", "null"], minimum: 0 },
      total_pontos_esgoto: { type: ["integer", "null"], minimum: 0 },
      total_ralos: { type: ["integer", "null"], minimum: 0 },
      reservatorio: {
        type: "object",
        properties: {
          capacidade_l: { type: ["number", "null"] },
          elevado: { type: "boolean" },
          inferior: { type: "boolean" },
        },
        required: ["capacidade_l", "elevado", "inferior"],
      },
      tratamento_esgoto: {
        type: "object",
        properties: {
          tem_fossa_septica: { type: "boolean" },
          tem_sumidouro: { type: "boolean" },
          tem_filtro_anaerobio: { type: "boolean" },
          capacidade_l: { type: ["number", "null"] },
        },
        required: ["tem_fossa_septica", "tem_sumidouro", "tem_filtro_anaerobio", "capacidade_l"],
      },
      tubulacao_estimada: {
        type: "object",
        properties: {
          pvc_25mm_metros: { type: ["number", "null"] },
          pvc_32mm_metros: { type: ["number", "null"] },
          pvc_50mm_metros: { type: ["number", "null"] },
          pvc_100mm_metros: { type: ["number", "null"] },
        },
        required: ["pvc_25mm_metros", "pvc_32mm_metros", "pvc_50mm_metros", "pvc_100mm_metros"],
      },
      observacoes: { type: "string", maxLength: 500 },
      confianca: { type: "string", enum: [...CONFIANCA] },
    },
    required: [
      "pontos_agua_fria_por_ambiente",
      "pontos_agua_quente_por_ambiente",
      "pontos_esgoto_por_ambiente",
      "total_pontos_agua_fria",
      "total_pontos_agua_quente",
      "total_pontos_esgoto",
      "total_ralos",
      "reservatorio",
      "tratamento_esgoto",
      "tubulacao_estimada",
      "observacoes",
      "confianca",
    ],
  },
} as const;

export const PROMPT_VERSION = "extract-hydraulic.v1";
