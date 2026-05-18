"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { DISCIPLINAS } from "@/lib/ai/prompts/_shared-extraction-schema";

const schema = z.object({
  project_id: z.string().uuid(),
  disciplina: z.enum(DISCIPLINAS).refine((v) => v !== "architectural", {
    message: "Use confirmExtractionAction para arquitetônico.",
  }),
});

export type ConfirmDisciplineInput = z.infer<typeof schema>;
export type ConfirmDisciplineResult = { ok: true } | { ok: false; error: string };

/**
 * Marca como confirmada a extração de uma disciplina complementar
 * (electrical/hydraulic/structural/gas/hvac).
 *
 * Sprint 9: edição manual da extração ainda não é suportada — apenas confirmação.
 * Para corrigir dados, re-suba o PDF com versão melhor.
 */
export async function confirmDisciplineExtractionAction(
  raw: ConfirmDisciplineInput,
): Promise<ConfirmDisciplineResult> {
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: "Dados inválidos." };
  }

  const supabase = await createClient();
  const { data: project, error: readErr } = await supabase
    .from("projects")
    .select("meta")
    .eq("id", parsed.data.project_id)
    .single();

  if (readErr || !project) {
    return { ok: false, error: "Projeto não encontrado." };
  }

  const meta = (project.meta ?? {}) as Record<string, unknown>;
  const ed = (meta.extracoes_disciplinas as Record<string, unknown> | undefined) ?? {};
  const current = ed[parsed.data.disciplina] as Record<string, unknown> | undefined;

  if (!current) {
    return { ok: false, error: "Extração não encontrada para esta disciplina." };
  }

  const newMeta = {
    ...meta,
    extracoes_disciplinas: {
      ...ed,
      [parsed.data.disciplina]: {
        ...current,
        confirmed_by_user: true,
        confirmed_at: new Date().toISOString(),
      },
    },
  };

  const { error: updateErr } = await supabase
    .from("projects")
    .update({ meta: newMeta })
    .eq("id", parsed.data.project_id);

  if (updateErr) {
    return { ok: false, error: updateErr.message };
  }

  revalidatePath(`/projetos/${parsed.data.project_id}`);
  return { ok: true };
}
