import { z } from "zod";

/**
 * Tipos e helpers compartilhados pelas extrações por disciplina (Sprint 9).
 *
 * Cada disciplina tem seu próprio schema/prompt, mas todos compartilham:
 *   - `confianca` (alta/media/baixa)
 *   - `observacoes` curtas pro profissional
 *   - `pontos_por_ambiente` — lista flexível "ambiente → quantidade do recurso"
 *
 * Isso permite que o `_meta` (prompt_version, model, usage, extracted_at)
 * seja idêntico em todas as disciplinas e que a UI use um único componente
 * de revisão.
 */

export const DISCIPLINAS = [
  "architectural",
  "electrical",
  "hydraulic",
  "structural",
  "gas",
  "hvac",
] as const;
export type Disciplina = (typeof DISCIPLINAS)[number];

export const DISCIPLINA_LABEL: Record<Disciplina, string> = {
  architectural: "Arquitetônico",
  electrical: "Elétrico",
  hydraulic: "Hidrossanitário",
  structural: "Estrutural",
  gas: "Gás",
  hvac: "Climatização (HVAC)",
};

export const DISCIPLINA_SHORT: Record<Disciplina, string> = {
  architectural: "ARQ",
  electrical: "ELE",
  hydraulic: "HID",
  structural: "EST",
  gas: "GÁS",
  hvac: "AC",
};

export const CONFIANCA = ["alta", "media", "baixa"] as const;

export const pontoAmbienteSchema = z.object({
  ambiente: z.string().min(1).max(120).describe("Nome do ambiente"),
  quantidade: z.number().int().nonnegative().describe("Quantidade contada do recurso no ambiente"),
});

export const PONTO_AMBIENTE_JSON_SCHEMA = {
  type: "object",
  properties: {
    ambiente: { type: "string", description: "Nome do ambiente" },
    quantidade: {
      type: "integer",
      minimum: 0,
      description: "Quantidade contada do recurso no ambiente",
    },
  },
  required: ["ambiente", "quantidade"],
} as const;

/** Meta padrão que o Inngest job grava junto da extração. */
export type ExtractionMeta = {
  prompt_version: string;
  model: string;
  usage: { input_tokens: number; output_tokens: number; usd_cost: number };
  extracted_at: string;
  source_org_id?: string;
  source_file_id?: string;
  confirmed_by_user?: boolean;
  confirmed_at?: string;
};
