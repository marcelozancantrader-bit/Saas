"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";
import { assertPlatformAdminAndGetAdminClient } from "@/lib/auth/platform-admin";

const schema = z.object({
  sub_id: z.string().uuid(),
  reason: z.string().min(3).max(500),
});

/**
 * Cancela manualmente uma subscription. Não chama API do provider (Asaas) —
 * só atualiza o registro interno. Para cancelar no Asaas, use o painel deles
 * e o webhook chega depois.
 */
export async function cancelSubscriptionAction(input: z.infer<typeof schema>) {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }
  const { sub_id, reason } = parsed.data;

  const { me, supabase } = await assertPlatformAdminAndGetAdminClient();

  const { data: sub } = await supabase
    .from("subscriptions")
    .select("id, org_id, plano, status, meta")
    .eq("id", sub_id)
    .maybeSingle();
  if (!sub) return { ok: false as const, error: "Subscription não encontrada" };

  const subTyped = sub as {
    id: string;
    org_id: string;
    plano: string;
    status: string;
    meta: Record<string, unknown> | null;
  };

  if (subTyped.status === "canceled") {
    return { ok: false as const, error: "Subscription já está cancelada" };
  }

  const newMeta = {
    ...(subTyped.meta ?? {}),
    canceled_by: me.email,
    canceled_by_user_id: me.id,
    canceled_at: new Date().toISOString(),
    cancel_reason: reason,
  };

  const { error: updErr } = await supabase
    .from("subscriptions")
    .update({ status: "canceled", meta: newMeta, updated_at: new Date().toISOString() })
    .eq("id", sub_id);
  if (updErr) return { ok: false as const, error: updErr.message };

  const h = await headers();
  await supabase.from("audit_log").insert({
    org_id: subTyped.org_id,
    actor_id: me.id,
    actor_type: "platform_admin",
    action: "subscription.canceled",
    entity_type: "subscription",
    entity_id: sub_id,
    payload: {
      previous_status: subTyped.status,
      plano: subTyped.plano,
      reason,
      admin_email: me.email,
    },
    ip: h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    user_agent: h.get("user-agent") ?? null,
  });

  revalidatePath("/admin/subscriptions");
  revalidatePath(`/admin/organizations/${subTyped.org_id}`);

  return { ok: true as const };
}
