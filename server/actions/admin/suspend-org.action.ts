"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";
import { assertPlatformAdminAndGetAdminClient } from "@/lib/auth/platform-admin";

const suspendSchema = z.object({
  org_id: z.string().uuid(),
  reason: z.string().min(3).max(500),
});

const unsuspendSchema = z.object({
  org_id: z.string().uuid(),
});

/**
 * Suspende uma organização armazenando flag em organizations.meta.
 * Não bloqueia DB-level (RLS continua); a checagem é feita na UI / actions futuras.
 */
export async function suspendOrgAction(input: z.infer<typeof suspendSchema>) {
  const parsed = suspendSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }
  const { org_id, reason } = parsed.data;

  const { me, supabase } = await assertPlatformAdminAndGetAdminClient();

  const { data: org } = await supabase
    .from("organizations")
    .select("id, meta, name")
    .eq("id", org_id)
    .maybeSingle();
  if (!org) return { ok: false as const, error: "Organização não encontrada" };
  const orgTyped = org as { id: string; meta: Record<string, unknown> | null; name: string };

  const newMeta = {
    ...(orgTyped.meta ?? {}),
    suspended_at: new Date().toISOString(),
    suspended_by: me.email,
    suspended_by_user_id: me.id,
    suspended_reason: reason,
  };

  const { error: updErr } = await supabase
    .from("organizations")
    .update({ meta: newMeta, updated_at: new Date().toISOString() })
    .eq("id", org_id);
  if (updErr) return { ok: false as const, error: updErr.message };

  const h = await headers();
  await supabase.from("audit_log").insert({
    org_id,
    actor_id: me.id,
    actor_type: "platform_admin",
    action: "org.suspended",
    entity_type: "organization",
    entity_id: org_id,
    payload: { reason, admin_email: me.email },
    ip: h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    user_agent: h.get("user-agent") ?? null,
  });

  revalidatePath(`/admin/organizations/${org_id}`);
  revalidatePath("/admin/organizations");

  return { ok: true as const };
}

export async function unsuspendOrgAction(input: z.infer<typeof unsuspendSchema>) {
  const parsed = unsuspendSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }
  const { org_id } = parsed.data;

  const { me, supabase } = await assertPlatformAdminAndGetAdminClient();

  const { data: org } = await supabase
    .from("organizations")
    .select("id, meta")
    .eq("id", org_id)
    .maybeSingle();
  if (!org) return { ok: false as const, error: "Organização não encontrada" };
  const orgTyped = org as { id: string; meta: Record<string, unknown> | null };

  // Limpa as flags de suspensão preservando outras meta
  const newMeta = { ...(orgTyped.meta ?? {}) };
  delete newMeta.suspended_at;
  delete newMeta.suspended_by;
  delete newMeta.suspended_by_user_id;
  delete newMeta.suspended_reason;

  const { error: updErr } = await supabase
    .from("organizations")
    .update({ meta: newMeta, updated_at: new Date().toISOString() })
    .eq("id", org_id);
  if (updErr) return { ok: false as const, error: updErr.message };

  const h = await headers();
  await supabase.from("audit_log").insert({
    org_id,
    actor_id: me.id,
    actor_type: "platform_admin",
    action: "org.unsuspended",
    entity_type: "organization",
    entity_id: org_id,
    payload: { admin_email: me.email },
    ip: h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    user_agent: h.get("user-agent") ?? null,
  });

  revalidatePath(`/admin/organizations/${org_id}`);
  revalidatePath("/admin/organizations");

  return { ok: true as const };
}
