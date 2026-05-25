/**
 * Schema zod pra `projects.meta jsonb`.
 *
 * Antes deste arquivo, 6 RSCs faziam `(project.meta as Record<string,unknown>)
 * ?.extracao_planta as { ... }` — bypassa o type system inteiro. Se a forma de
 * `meta` mudar (P12 adicionou; P15+ vai adicionar mais), bugs silenciosos.
 *
 * Uso:
 *   import { parseProjectMeta } from "@/lib/validators/project-meta.schema";
 *   const meta = parseProjectMeta(project.meta);
 *   const area = meta.extracao_planta?.area_total_m2;
 */

import { z } from "zod";

const ambienteSchema = z.object({
  nome: z.string(),
  area_m2: z.number().nullable(),
  tipo: z.string(),
});

const elementosEspeciaisSchema = z
  .object({
    piscina: z.boolean(),
    churrasqueira: z.boolean(),
    sacada: z.boolean(),
    garagem: z.boolean(),
    jardim: z.boolean(),
    area_servico_externa: z.boolean(),
  })
  .partial();

const quantitativosSchema = z
  .object({
    portas_internas: z.number().int().nullable(),
    portas_externas: z.number().int().nullable(),
    janelas_grandes: z.number().int().nullable(),
    janelas_pequenas: z.number().int().nullable(),
    bacios: z.number().int().nullable(),
    lavatorios: z.number().int().nullable(),
    pias_cozinha: z.number().int().nullable(),
    m_rodape: z.number().nullable(),
    m2_rev_parede: z.number().nullable(),
  })
  .partial();

export const extracaoPlantaSchema = z
  .object({
    area_total_m2: z.number().nullable(),
    numero_pavimentos: z.number().nullable(),
    ambientes: z.array(ambienteSchema),
    elementos_especiais: elementosEspeciaisSchema,
    observacoes: z.string().nullable(),
    confianca: z.enum(["alta", "media", "baixa"]).nullable(),
    padrao_construtivo: z.enum(["baixo", "normal", "alto", "minimo"]).nullable(),
    confirmed_by_user: z.boolean(),
    source_file_id: z.string(),
    extracted_at: z.string(),
    quantitativos: quantitativosSchema,
  })
  .partial();

export type ExtracaoPlanta = z.infer<typeof extracaoPlantaSchema>;

const extracaoDisciplinaSchema = z
  .object({
    source_file_id: z.string(),
    data: z.record(z.string(), z.unknown()),
    extracted_at: z.string(),
    confirmed_by_user: z.boolean(),
    prompt_version: z.string(),
    usd_cost: z.number(),
  })
  .partial();

export type ExtracaoDisciplina = z.infer<typeof extracaoDisciplinaSchema>;

export const zoneamentoCustomSchema = z
  .object({
    cidade_nome: z.string().nullable(),
    uf: z.string().nullable(),
    label: z.string(),
    recuo_frontal_m: z.number().nullable(),
    recuo_lateral_m: z.number().nullable(),
    recuo_fundos_m: z.number().nullable(),
    taxa_ocupacao_pct: z.number().nullable(),
    coeficiente_aproveitamento: z.number().nullable(),
  })
  .partial();

export type ZoneamentoCustomMeta = z.infer<typeof zoneamentoCustomSchema>;

export const recuosMedidosSchema = z
  .object({
    frontal_m: z.number().nullable(),
    lateral_direito_m: z.number().nullable(),
    lateral_esquerdo_m: z.number().nullable(),
    fundos_m: z.number().nullable(),
    updated_at: z.string().nullable(),
  })
  .partial();

export type RecuosMedidos = z.infer<typeof recuosMedidosSchema>;

export const projectMetaSchema = z
  .object({
    extracao_planta: extracaoPlantaSchema,
    extracoes_disciplinas: z.record(z.string(), extracaoDisciplinaSchema),
    zoneamento_custom: zoneamentoCustomSchema,
    recuos_medidos: recuosMedidosSchema,
  })
  .partial();

export type ProjectMeta = z.infer<typeof projectMetaSchema>;

/**
 * Parse seguro: retorna o data validado ou `{}` se inválido/null.
 * Nunca throwa — schemas são tolerantes (todos campos optional).
 */
export function parseProjectMeta(raw: unknown): ProjectMeta {
  if (!raw || typeof raw !== "object") return {};
  const parsed = projectMetaSchema.safeParse(raw);
  return parsed.success ? parsed.data : {};
}
