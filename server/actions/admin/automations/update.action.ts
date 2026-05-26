"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { assertPlatformAdminAndGetAdminClient } from "@/lib/auth/platform-admin";
import { automationGraphSchema } from "@/lib/automations/types";

const schema = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(2).max(120).optional(),
  description: z.string().trim().max(500).optional().or(z.literal("")),
  graph: automationGraphSchema.optional(),
});

export type UpdateAutomationResult = { ok: true } | { ok: false; error: string };

export async function updateAutomationAction(
  raw: z.infer<typeof schema>,
): Promise<UpdateAutomationResult> {
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  const { supabase } = await assertPlatformAdminAndGetAdminClient();

  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (parsed.data.name !== undefined) updates.name = parsed.data.name;
  if (parsed.data.description !== undefined) {
    updates.description = parsed.data.description || null;
  }
  if (parsed.data.graph !== undefined) updates.graph = parsed.data.graph;

  const { error } = await supabase
    .from("admin_automations")
    .update(updates)
    .eq("id", parsed.data.id);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/automacoes");
  revalidatePath(`/admin/automacoes/${parsed.data.id}`);
  return { ok: true };
}
