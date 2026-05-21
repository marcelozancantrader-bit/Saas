"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";
import { assertPlatformAdminAndGetAdminClient } from "@/lib/auth/platform-admin";
import { PLAN_ORDER, type PlanId } from "@/lib/plans/limits";

const schema = z.object({
  org_id: z.string().uuid(),
  new_plan: z.enum(PLAN_ORDER as [PlanId, ...PlanId[]]),
  reason: z.string().min(3).max(500),
});

export async function changeOrgPlanAction(input: z.infer<typeof schema>) {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }
  const { org_id, new_plan, reason } = parsed.data;

  const { me, supabase } = await assertPlatformAdminAndGetAdminClient();

  // Carrega org atual pra audit
  const { data: org } = await supabase
    .from("organizations")
    .select("id, plano, name")
    .eq("id", org_id)
    .maybeSingle();
  if (!org) return { ok: false as const, error: "Organização não encontrada" };
  const orgTyped = org as { id: string; plano: PlanId; name: string };

  if (orgTyped.plano === new_plan) {
    return { ok: false as const, error: "Org já está neste plano" };
  }

  // 1. Update org.plano
  const { error: updErr } = await supabase
    .from("organizations")
    .update({ plano: new_plan, updated_at: new Date().toISOString() })
    .eq("id", org_id);
  if (updErr) return { ok: false as const, error: updErr.message };

  // 2. Cancela subs ativas anteriores
  await supabase
    .from("subscriptions")
    .update({ status: "canceled", updated_at: new Date().toISOString() })
    .eq("org_id", org_id)
    .eq("status", "active");

  // 3. Cria subscription manual (provider='manual') refletindo o novo plano
  await supabase.from("subscriptions").insert({
    org_id,
    plano: new_plan,
    status: "active",
    provider: "manual",
    meta: {
      reason,
      changed_by: me.email,
      changed_by_user_id: me.id,
      previous_plan: orgTyped.plano,
    },
  });

  // 4. Audit log
  const h = await headers();
  await supabase.from("audit_log").insert({
    org_id,
    actor_id: me.id,
    actor_type: "platform_admin",
    action: "org.plan_changed",
    entity_type: "organization",
    entity_id: org_id,
    payload: {
      from_plan: orgTyped.plano,
      to_plan: new_plan,
      reason,
      admin_email: me.email,
    },
    ip: h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    user_agent: h.get("user-agent") ?? null,
  });

  revalidatePath(`/admin/organizations/${org_id}`);
  revalidatePath("/admin/organizations");
  revalidatePath("/admin");

  return { ok: true as const };
}
