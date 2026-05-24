"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({
  template_id: z.string().uuid(),
});

export type DeleteTemplateResult = { ok: true } | { ok: false; error: string };

export async function deleteTemplateAction(
  raw: z.infer<typeof schema>,
): Promise<DeleteTemplateResult> {
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Dados inválidos." };

  const supabase = await createClient();
  // RLS de UPDATE/DELETE exige owner/admin — service vai falhar pra member
  const { error } = await supabase
    .from("org_doc_templates")
    .delete()
    .eq("id", parsed.data.template_id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/configuracoes");
  return { ok: true };
}
