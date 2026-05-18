import { z } from "zod";

export const TIPOLOGIA_VALUES = ["residencial", "comercial", "reforma", "outros"] as const;
export const PADRAO_VALUES = ["popular", "medio", "alto", "luxo"] as const;
export const STATUS_VALUES = [
  "rascunho",
  "em_andamento",
  "aguardando_cliente",
  "concluido",
  "arquivado",
] as const;

function trimOrUndefined(v: unknown): string | undefined {
  if (typeof v !== "string") return undefined;
  const trimmed = v.trim();
  return trimmed.length === 0 ? undefined : trimmed;
}

function emptyToUndefined(v: unknown): unknown {
  return v === "" ? undefined : v;
}

const numericOptional = z.preprocess(emptyToUndefined, z.coerce.number().positive().optional());

export const projectSchema = z.object({
  nome: z.string().trim().min(2, "Nome muito curto").max(120),
  client_id: z.preprocess(emptyToUndefined, z.string().uuid().optional()),
  tipologia: z.enum(TIPOLOGIA_VALUES, { error: "Tipologia inválida" }),
  area_prevista_m2: numericOptional,
  padrao_construtivo: z.preprocess(emptyToUndefined, z.enum(PADRAO_VALUES).optional()),
  endereco_cep: z.preprocess(
    (v) => (typeof v === "string" ? v.replace(/\D+/g, "") : v),
    z
      .string()
      .optional()
      .refine((v) => v === undefined || v.length === 0 || v.length === 8, {
        message: "CEP precisa ter 8 dígitos",
      }),
  ),
  endereco_completo: z.preprocess(trimOrUndefined, z.string().optional()),
  status: z.enum(STATUS_VALUES).default("rascunho"),
  cidade_codigo: z.preprocess(trimOrUndefined, z.string().max(40).optional()),
  zoneamento: z.preprocess(trimOrUndefined, z.string().max(40).optional()),
  area_terreno_m2: numericOptional,
});

export type ProjectInput = z.infer<typeof projectSchema>;

export const TIPOLOGIA_LABEL: Record<(typeof TIPOLOGIA_VALUES)[number], string> = {
  residencial: "Residencial",
  comercial: "Comercial",
  reforma: "Reforma",
  outros: "Outros",
};
export const PADRAO_LABEL: Record<(typeof PADRAO_VALUES)[number], string> = {
  popular: "Popular",
  medio: "Médio",
  alto: "Alto",
  luxo: "Luxo",
};
export const STATUS_LABEL: Record<(typeof STATUS_VALUES)[number], string> = {
  rascunho: "Rascunho",
  em_andamento: "Em andamento",
  aguardando_cliente: "Aguardando cliente",
  concluido: "Concluído",
  arquivado: "Arquivado",
};
