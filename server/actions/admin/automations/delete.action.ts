"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { assertPlatformAdminAndGetAdminClient } from "@/lib/auth/platform-admin";

const schema = z.object({ id: z.string().uuid() });

export type DeleteAutomationResult = { ok: true } | { ok: false; error: string };

export async function deleteAutomationAction(
  raw: z.infer<typeof schema>,
): Promise<DeleteAutomationResult> {
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "ID inválido." };

  const { supabase } = await assertPlatformAdminAndGetAdminClient();

  const { error } = await supabase.from("admin_automations").delete().eq("id", parsed.data.id);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/automacoes");
  return { ok: true };
}
