"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({
  entry_id: z.string().uuid(),
  visible: z.boolean(),
});

export type TogglePortalVisibleResult = { ok: true } | { ok: false; error: string };

export async function toggleDiaryPortalVisibleAction(
  raw: z.infer<typeof schema>,
): Promise<TogglePortalVisibleResult> {
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Dados inválidos." };

  const supabase = await createClient();
  const { data: entry, error: readErr } = await supabase
    .from("project_diary_entries")
    .select("id, project_id")
    .eq("id", parsed.data.entry_id)
    .single<{ id: string; project_id: string }>();
  if (readErr || !entry) return { ok: false, error: "Entrada não encontrada." };

  const { error: updErr } = await supabase
    .from("project_diary_entries")
    .update({ portal_visible: parsed.data.visible })
    .eq("id", parsed.data.entry_id);
  if (updErr) return { ok: false, error: updErr.message };

  revalidatePath(`/projetos/${entry.project_id}`);
  return { ok: true };
}
