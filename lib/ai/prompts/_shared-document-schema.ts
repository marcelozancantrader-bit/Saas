import { z } from "zod";

/**
 * Schema comum para documentos gerados pela IA.
 *
 * Em vez de pedir para Claude gerar Tiptap JSON diretamente (complexo e propenso a erros
 * de estrutura), pedimos um formato simplificado de "seções" — cada uma tem heading
 * + lista de parágrafos ou itens. O server converte para Tiptap JSON via
 * lib/tiptap/from-sections.ts.
 *
 * Este schema é usado por todos os 4 documentos (memorial, caderno, proposta, contrato).
 */

export const sectionContentSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("paragraph"),
    text: z.string().min(1).max(4000),
  }),
  z.object({
    type: z.literal("bullet_list"),
    items: z.array(z.string().min(1).max(2000)).min(1).max(50),
  }),
  z.object({
    type: z.literal("ordered_list"),
    items: z.array(z.string().min(1).max(2000)).min(1).max(50),
  }),
  z.object({
    type: z.literal("subheading"),
    text: z.string().min(1).max(200),
  }),
]);
export type SectionContent = z.infer<typeof sectionContentSchema>;

export const sectionSchema = z.object({
  heading: z.string().min(1).max(200).describe("Título da seção (vira H2 no documento)"),
  content: z
    .array(sectionContentSchema)
    .min(1)
    .max(40)
    .describe("Blocos de conteúdo da seção, em ordem"),
});
export type Section = z.infer<typeof sectionSchema>;

export const generatedDocumentSchema = z.object({
  titulo: z.string().min(1).max(200).describe("Título do documento (H1)"),
  sections: z.array(sectionSchema).min(1).max(20),
  observacoes_internas: z
    .string()
    .max(4000)
    .optional()
    .describe(
      "Notas para o profissional (não vai no documento final). Use para sinalizar pontos que precisam de revisão manual ou dados ausentes.",
    ),
});
export type GeneratedDocument = z.infer<typeof generatedDocumentSchema>;

/**
 * JSON Schema for Anthropic tool_use. We hand-roll instead of relying on zod-to-json-schema
 * to keep tight control over what Claude sees.
 */
export const GENERATED_DOCUMENT_TOOL_INPUT_SCHEMA = {
  type: "object",
  properties: {
    titulo: {
      type: "string",
      description: "Título do documento (será o H1 da primeira página)",
    },
    sections: {
      type: "array",
      description: "Lista de seções do documento, na ordem em que devem aparecer",
      items: {
        type: "object",
        properties: {
          heading: { type: "string", description: "Título da seção (H2)" },
          content: {
            type: "array",
            description: "Blocos de conteúdo da seção, em ordem",
            items: {
              oneOf: [
                {
                  type: "object",
                  properties: {
                    type: { type: "string", enum: ["paragraph"] },
                    text: { type: "string", description: "Texto do parágrafo" },
                  },
                  required: ["type", "text"],
                },
                {
                  type: "object",
                  properties: {
                    type: { type: "string", enum: ["subheading"] },
                    text: { type: "string", description: "Sub-título (H3)" },
                  },
                  required: ["type", "text"],
                },
                {
                  type: "object",
                  properties: {
                    type: { type: "string", enum: ["bullet_list"] },
                    items: {
                      type: "array",
                      items: { type: "string" },
                      description: "Itens da lista não-numerada",
                    },
                  },
                  required: ["type", "items"],
                },
                {
                  type: "object",
                  properties: {
                    type: { type: "string", enum: ["ordered_list"] },
                    items: {
                      type: "array",
                      items: { type: "string" },
                      description: "Itens da lista numerada",
                    },
                  },
                  required: ["type", "items"],
                },
              ],
            },
          },
        },
        required: ["heading", "content"],
      },
    },
    observacoes_internas: {
      type: "string",
      maxLength: 4000,
      description:
        "Notas para o profissional (não vai no documento final). Use para sinalizar pontos que precisam revisão manual ou dados ausentes. Máx 4000 caracteres.",
    },
  },
  required: ["titulo", "sections"],
} as const;

export const RECORD_DOCUMENT_TOOL_NAME = "record_generated_document" as const;

export const RECORD_DOCUMENT_TOOL_DESCRIPTION =
  "Registra o documento gerado em formato estruturado (título + seções). Esta é a ÚNICA forma de retornar a resposta — sempre invoque esta tool após produzir o conteúdo.";
