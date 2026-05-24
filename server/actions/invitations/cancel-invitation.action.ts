"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({
  invitation_id: z.string().uuid(),
});

export type CancelInvitationResult = { ok: true } | { ok: false; error: string };

export async function cancelInvitationAction(
  raw: z.infer<typeof schema>,
): Promise<CancelInvitationResult> {
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Dados inválidos." };

  const supabase = await createClient();
  // RLS update gated em owner/admin da org dona do convite
  const { error } = await supabase
    .from("invitations")
    .update({ status: "cancelled" })
    .eq("id", parsed.data.invitation_id)
    .eq("status", "pending");
  if (error) return { ok: false, error: error.message };

  revalidatePath("/configuracoes/membros");
  return { ok: true };
}
