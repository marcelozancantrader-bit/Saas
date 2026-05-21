"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const optionalNumber = z.preprocess(
  (v) => (v === "" || v === undefined || v === null ? null : Number(v)),
  z.number().min(0).max(50).nullable(),
);

const schema = z.object({
  project_id: z.string().uuid(),
  frontal_m: optionalNumber,
  lateral_direito_m: optionalNumber,
  lateral_esquerdo_m: optionalNumber,
  fundos_m: optionalNumber,
});

export type SaveRecuosResult = { ok: true } | { ok: false; error: string };

/**
 * Persiste recuos efetivamente medidos pelo profissional em
 * projects.meta.recuos_medidos. Esses valores entram no
 * runZoneamentoChecks e fecham o gap do "warn sempre".
 */
export async function saveRecuosAction(formData: FormData): Promise<SaveRecuosResult> {
  const parsed = schema.safeParse({
    project_id: formData.get("project_id"),
    frontal_m: formData.get("frontal_m"),
    lateral_direito_m: formData.get("lateral_direito_m"),
    lateral_esquerdo_m: formData.get("lateral_esquerdo_m"),
    fundos_m: formData.get("fundos_m"),
  });
  if (!parsed.success) {
    return { ok: false, error: "Valores inválidos. Use números (≥ 0 e ≤ 50m)." };
  }

  const supabase = await createClient();

  // Lê meta atual, mescla, persiste
  const { data: project, error: readErr } = await supabase
    .from("projects")
    .select("id, meta")
    .eq("id", parsed.data.project_id)
    .single<{ id: string; meta: Record<string, unknown> | null }>();
  if (readErr || !project) {
    return { ok: false, error: "Projeto não encontrado ou sem permissão." };
  }

  const newMeta = {
    ...(project.meta ?? {}),
    recuos_medidos: {
      frontal_m: parsed.data.frontal_m,
      lateral_direito_m: parsed.data.lateral_direito_m,
      lateral_esquerdo_m: parsed.data.lateral_esquerdo_m,
      fundos_m: parsed.data.fundos_m,
      updated_at: new Date().toISOString(),
    },
  };

  const { error: updErr } = await supabase
    .from("projects")
    .update({ meta: newMeta, updated_at: new Date().toISOString() })
    .eq("id", parsed.data.project_id);
  if (updErr) {
    return { ok: false, error: updErr.message };
  }

  revalidatePath(`/projetos/${parsed.data.project_id}`);
  return { ok: true };
}
