import { z } from "zod";

/**
 * D7 — schema do briefing estruturado preenchido pelo cliente via portal.
 *
 * Mantemos schema fixo (zod) em vez de form builder dinâmico — facilita
 * versionamento e validação, e cliente típico responde 1 vez por projeto.
 *
 * Mudanças futuras: incrementar `BRIEFING_SCHEMA_VERSION` e fazer migração
 * leve em respostas existentes.
 */

export const BRIEFING_SCHEMA_VERSION = 1;

export const TIPO_OBRA = ["construcao_nova", "reforma", "ampliacao", "interiores"] as const;

export const ORCAMENTO_FAIXA = [
  "ate_300k",
  "300_500k",
  "500_800k",
  "800_1500k",
  "acima_1500k",
] as const;

export const ESTILOS = [
  "contemporaneo",
  "minimalista",
  "rustico",
  "industrial",
  "classico",
  "tropical",
  "indefinido",
] as const;

export const briefingRespostasSchema = z.object({
  tipo_obra: z.enum(TIPO_OBRA),
  quartos: z.number().int().min(0).max(20),
  banheiros: z.number().int().min(0).max(20),
  suites: z.number().int().min(0).max(20),
  vagas_garagem: z.number().int().min(0).max(20),
  ambientes_especiais: z.array(z.string().min(1).max(50)).max(20),
  estilo_preferido: z.enum(ESTILOS),
  orcamento_estimado: z.enum(ORCAMENTO_FAIXA),
  prazo_desejado_meses: z.number().int().min(1).max(120),
  moradores: z.string().max(200),
  tem_pets: z.boolean(),
  pets_detalhes: z.string().max(300),
  restricoes: z.string().max(1500),
  inspiracoes: z.string().max(2000),
  observacoes: z.string().max(2000),
});

export type BriefingRespostas = z.infer<typeof briefingRespostasSchema>;

export const TIPO_OBRA_LABEL: Record<(typeof TIPO_OBRA)[number], string> = {
  construcao_nova: "Construção nova",
  reforma: "Reforma",
  ampliacao: "Ampliação",
  interiores: "Só design de interiores",
};

export const ORCAMENTO_LABEL: Record<(typeof ORCAMENTO_FAIXA)[number], string> = {
  ate_300k: "Até R$ 300 mil",
  "300_500k": "R$ 300–500 mil",
  "500_800k": "R$ 500–800 mil",
  "800_1500k": "R$ 800 mil–1,5 mi",
  acima_1500k: "Acima de R$ 1,5 mi",
};

export const ESTILO_LABEL: Record<(typeof ESTILOS)[number], string> = {
  contemporaneo: "Contemporâneo",
  minimalista: "Minimalista",
  rustico: "Rústico",
  industrial: "Industrial",
  classico: "Clássico",
  tropical: "Tropical",
  indefinido: "Ainda não decidi",
};

export const AMBIENTES_SUGERIDOS = [
  "Home office",
  "Ateliê / hobby room",
  "Academia / espaço fitness",
  "Piscina",
  "Varanda gourmet",
  "Sauna",
  "Sala de TV / cinema",
  "Closet master",
  "Lavabo",
  "Despensa",
  "Área de serviço externa",
  "Quintal grande",
  "Churrasqueira",
  "Adega",
] as const;
