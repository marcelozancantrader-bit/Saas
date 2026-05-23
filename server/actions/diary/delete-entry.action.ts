"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({
  entry_id: z.string().uuid(),
});

export type DeleteDiaryEntryResult = { ok: true } | { ok: false; error: string };

export async function deleteDiaryEntryAction(
  raw: z.infer<typeof schema>,
): Promise<DeleteDiaryEntryResult> {
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Dados inválidos." };

  const supabase = await createClient();

  // RLS garante que só membros podem ler/deletar entradas do projeto.
  const { data: entry, error: readErr } = await supabase
    .from("project_diary_entries")
    .select("id, project_id, photo_paths")
    .eq("id", parsed.data.entry_id)
    .single<{ id: string; project_id: string; photo_paths: string[] }>();
  if (readErr || !entry) {
    return { ok: false, error: "Entrada não encontrada." };
  }

  // Remove fotos do Storage primeiro (best-effort — se falhar, log mas continua).
  if (entry.photo_paths.length > 0) {
    await supabase.storage
      .from("project-files")
      .remove(entry.photo_paths)
      .catch(() => undefined);
  }

  const { error: delErr } = await supabase
    .from("project_diary_entries")
    .delete()
    .eq("id", parsed.data.entry_id);
  if (delErr) return { ok: false, error: delErr.message };

  revalidatePath(`/projetos/${entry.project_id}`);
  return { ok: true };
}
