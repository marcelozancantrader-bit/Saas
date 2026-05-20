"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const zoneamentoCustomSchema = z.object({
  cidade_nome: z.string().min(2).max(120),
  uf: z.string().length(2),
  lei: z.string().max(200),
  ano_lei: z.coerce.number().int().min(1900).max(2100).nullable(),
  ultima_revisao_ano: z.coerce.number().int().min(1900).max(2100).nullable(),
  fonte_url: z.string().url().nullable(),
  zona_codigo: z.string().min(1).max(40),
  zona_label: z.string().min(1).max(160),
  ca_basico: z.coerce.number().nonnegative().max(20),
  ca_maximo: z.coerce.number().nonnegative().max(20).nullable(),
  to_max_pct: z.coerce.number().min(0).max(100),
  permeabilidade_min_pct: z.coerce.number().min(0).max(100).nullable(),
  altura_max_m: z.coerce.number().nonnegative().max(500).nullable(),
  recuo_frontal_m: z.coerce.number().nonnegative().max(50),
  recuo_lateral_m: z.coerce.number().nonnegative().max(50).nullable(),
  recuo_fundos_m: z.coerce.number().nonnegative().max(50).nullable(),
  vagas_por_unidade: z.coerce.number().int().min(0).max(20),
  origem: z.enum(["manual", "ia"]),
  confianca: z.enum(["alta", "media", "baixa"]).nullable(),
  observacao: z.string().max(300).nullable(),
});

export type ZoneamentoCustomInput = z.infer<typeof zoneamentoCustomSchema> & {
  project_id: string;
};

export type ZoneamentoCustomResult =
  | { ok: true }
  | { ok: false; error: string }
  | { ok: false; fieldErrors: Record<string, string[]> };

/**
 * Salva parâmetros urbanísticos customizados (cidade fora da curadoria) no projeto.
 * Vão em `projects.meta.zoneamento_custom` e marcamos `projects.cidade_codigo='custom'`
 * pra que o ZoneamentoCard saiba ler do meta em vez da curadoria.
 *
 * Origem 'manual' = engenheiro preencheu na mão.
 * Origem 'ia' = Claude buscou e o engenheiro confirmou.
 */
export async function saveZoneamentoCustomAction(
  raw: ZoneamentoCustomInput & { area_terreno_m2?: number | null },
): Promise<ZoneamentoCustomResult> {
  const { project_id, area_terreno_m2, ...rest } = raw;
  if (!project_id || typeof project_id !== "string") {
    return { ok: false, error: "Projeto inválido." };
  }

  const parsed = zoneamentoCustomSchema.safeParse(rest);
  if (!parsed.success) {
    return { ok: false, fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const { data: project, error: readErr } = await supabase
    .from("projects")
    .select("meta")
    .eq("id", project_id)
    .single();
  if (readErr || !project) {
    return { ok: false, error: "Projeto não encontrado ou sem permissão." };
  }

  const currentMeta = (project.meta ?? {}) as Record<string, unknown>;
  const newMeta = {
    ...currentMeta,
    zoneamento_custom: {
      ...parsed.data,
      saved_at: new Date().toISOString(),
    },
  };

  const update: Record<string, unknown> = {
    meta: newMeta,
    cidade_codigo: "custom",
    zoneamento: parsed.data.zona_codigo,
  };
  if (typeof area_terreno_m2 === "number" && area_terreno_m2 >= 0) {
    update.area_terreno_m2 = area_terreno_m2;
  }

  const { error: updateErr } = await supabase.from("projects").update(update).eq("id", project_id);
  if (updateErr) {
    return { ok: false, error: updateErr.message };
  }

  revalidatePath(`/projetos/${project_id}`);
  return { ok: true };
}
