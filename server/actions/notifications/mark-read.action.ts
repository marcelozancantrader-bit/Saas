"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({
  notification_id: z.string().uuid(),
});

export type MarkReadResult = { ok: true; read_at: string } | { ok: false; error: string };

export async function markNotificationReadAction(
  raw: z.infer<typeof schema>,
): Promise<MarkReadResult> {
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Inválido." };

  const supabase = await createClient();
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: now })
    .eq("id", parsed.data.notification_id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/");
  return { ok: true, read_at: now };
}
