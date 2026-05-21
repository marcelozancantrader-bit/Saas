"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { fetchPlanoDirector } from "@/lib/ai/fetch-plano-diretor";

const schema = z.object({
  project_id: z.string().uuid(),
  cidade_nome: z.string().min(2).max(100),
  uf: z.string().length(2),
});

export type FetchPlanoDirectorResult =
  | { ok: true; usd_cost: number; confianca: "alta" | "media" | "baixa" }
  | { ok: false; error: string };

/**
 * Dispara extração via Claude do plano diretor da cidade informada.
 * Salva em projects.meta.zoneamento_custom com origem='ia'.
 * Também marca cidade_codigo='custom' e zoneamento=zona_codigo retornado.
 */
export async function fetchPlanoDirectorAction(
  raw: z.infer<typeof schema>,
): Promise<FetchPlanoDirectorResult> {
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }
  const { project_id, cidade_nome, uf } = parsed.data;

  const supabase = await createClient();

  // Membership check (RLS já cobre, mas erro melhor)
  const { data: project } = await supabase
    .from("projects")
    .select("id, meta")
    .eq("id", project_id)
    .single<{ id: string; meta: Record<string, unknown> | null }>();
  if (!project) return { ok: false, error: "Projeto não encontrado ou sem permissão." };

  let result: Awaited<ReturnType<typeof fetchPlanoDirector>>;
  try {
    result = await fetchPlanoDirector({ cidade_nome, uf });
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Falha ao consultar IA. Tente novamente.",
    };
  }

  const newMeta = {
    ...(project.meta ?? {}),
    zoneamento_custom: {
      cidade_nome: result.cidade_nome,
      uf: result.uf,
      lei: result.lei,
      ano_lei: result.ano_lei,
      ultima_revisao_ano: result.ultima_revisao_ano,
      fonte_url: result.fonte_url,
      origem: "ia" as const,
      confianca: result.confianca,
      observacao: result.observacao,
      // ZoneamentoRule shape
      label: result.zona_label,
      ca_basico: result.ca_basico,
      ca_maximo: result.ca_maximo,
      to_max_pct: result.to_max_pct,
      altura_max_m: result.altura_max_m,
      recuo_frontal_m: result.recuo_frontal_m,
      recuo_lateral_m: result.recuo_lateral_m,
      recuo_fundos_m: result.recuo_fundos_m,
      vagas_por_unidade: result.vagas_por_unidade,
      permeabilidade_min_pct: result.permeabilidade_min_pct,
      nota: result.observacao,
    },
  };

  const { error: updErr } = await supabase
    .from("projects")
    .update({
      cidade_codigo: "custom",
      zoneamento: result.zona_codigo,
      meta: newMeta,
      updated_at: new Date().toISOString(),
    })
    .eq("id", project_id);
  if (updErr) {
    return { ok: false, error: updErr.message };
  }

  revalidatePath(`/projetos/${project_id}`);
  return { ok: true, usd_cost: result._usage.usd_cost, confianca: result.confianca };
}
