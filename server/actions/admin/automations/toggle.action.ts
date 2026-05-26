"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { assertPlatformAdminAndGetAdminClient } from "@/lib/auth/platform-admin";

const schema = z.object({
  id: z.string().uuid(),
  enabled: z.boolean(),
});

export type ToggleAutomationResult = { ok: true } | { ok: false; error: string };

export async function toggleAutomationAction(
  raw: z.infer<typeof schema>,
): Promise<ToggleAutomationResult> {
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Dados inválidos." };

  const { supabase } = await assertPlatformAdminAndGetAdminClient();

  const { error } = await supabase
    .from("admin_automations")
    .update({ enabled: parsed.data.enabled, updated_at: new Date().toISOString() })
    .eq("id", parsed.data.id);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/automacoes");
  revalidatePath(`/admin/automacoes/${parsed.data.id}`);
  return { ok: true };
}
