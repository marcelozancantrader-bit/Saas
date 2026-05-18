"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { TIPOLOGIA, PADRAO } from "@/lib/ai/prompts/extract-floor-plan.v1";

const confirmSchema = z.object({
  project_id: z.string().uuid(),
  source_file_id: z.string().uuid(),
  area_total_m2: z.coerce.number().positive().nullable().optional(),
  numero_pavimentos: z.coerce.number().int().positive().nullable().optional(),
  tipologia: z.enum(TIPOLOGIA),
  padrao_construtivo: z.enum(PADRAO).nullable().optional(),
});

export type ConfirmExtractionInput = z.infer<typeof confirmSchema>;

export type ConfirmExtractionResult =
  | { ok: true }
  | { ok: false; error: string }
  | { ok: false; fieldErrors: Record<string, string[]> };

/**
 * Confirms (and possibly edits) the IA-extracted floor plan data.
 * Updates projects.meta.extracao_planta with the user-confirmed values,
 * AND updates the canonical fields on the projects row (tipologia,
 * area_prevista_m2, padrao_construtivo) so they show up in tables.
 */
export async function confirmExtractionAction(
  raw: ConfirmExtractionInput,
): Promise<ConfirmExtractionResult> {
  const parsed = confirmSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createClient();

  // Read current meta to merge (RLS guarantees we only get our org's project).
  const { data: project, error: readErr } = await supabase
    .from("projects")
    .select("meta")
    .eq("id", parsed.data.project_id)
    .single();

  if (readErr || !project) {
    return { ok: false, error: "Projeto não encontrado." };
  }

  const currentMeta = (project.meta ?? {}) as Record<string, unknown>;
  const existingExtraction =
    (currentMeta.extracao_planta as Record<string, unknown> | undefined) ?? {};

  const newMeta = {
    ...currentMeta,
    extracao_planta: {
      ...existingExtraction,
      source_file_id: parsed.data.source_file_id,
      area_total_m2: parsed.data.area_total_m2 ?? null,
      numero_pavimentos: parsed.data.numero_pavimentos ?? null,
      tipologia: parsed.data.tipologia,
      padrao_construtivo: parsed.data.padrao_construtivo ?? null,
      confirmed_by_user: true,
      confirmed_at: new Date().toISOString(),
    },
  };

  const { error: updateErr } = await supabase
    .from("projects")
    .update({
      meta: newMeta,
      tipologia: parsed.data.tipologia,
      padrao_construtivo: parsed.data.padrao_construtivo ?? null,
      area_prevista_m2: parsed.data.area_total_m2 ?? null,
    })
    .eq("id", parsed.data.project_id);

  if (updateErr) {
    return { ok: false, error: updateErr.message };
  }

  revalidatePath(`/projetos/${parsed.data.project_id}`);
  return { ok: true };
}
