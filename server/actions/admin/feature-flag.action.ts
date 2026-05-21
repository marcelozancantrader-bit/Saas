"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";
import { assertPlatformAdminAndGetAdminClient } from "@/lib/auth/platform-admin";

const upsertSchema = z.object({
  org_id: z.string().uuid().nullable(),
  key: z.string().min(1).max(80),
  value: z.string(), // string JSON ("true", "false", "\"text\"", etc.)
  expires_at: z.string().optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
});

export async function upsertFeatureFlagAction(input: z.infer<typeof upsertSchema>) {
  const parsed = upsertSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }
  const { org_id, key, value, expires_at, notes } = parsed.data;

  let parsedValue: unknown;
  try {
    parsedValue = JSON.parse(value);
  } catch {
    return {
      ok: false as const,
      error: 'Value precisa ser JSON válido (ex.: true, false, 100, "text")',
    };
  }

  const { me, supabase } = await assertPlatformAdminAndGetAdminClient();

  // Upsert: se já existe (org_id+key), atualiza; senão cria.
  let existing: { id: string } | null = null;
  if (org_id === null) {
    const { data } = await supabase
      .from("feature_flags")
      .select("id")
      .is("org_id", null)
      .eq("key", key)
      .maybeSingle();
    existing = data as { id: string } | null;
  } else {
    const { data } = await supabase
      .from("feature_flags")
      .select("id")
      .eq("org_id", org_id)
      .eq("key", key)
      .maybeSingle();
    existing = data as { id: string } | null;
  }

  if (existing) {
    const { error } = await supabase
      .from("feature_flags")
      .update({
        value: parsedValue,
        expires_at: expires_at || null,
        notes: notes || null,
      })
      .eq("id", existing.id);
    if (error) return { ok: false as const, error: error.message };
  } else {
    const { error } = await supabase.from("feature_flags").insert({
      org_id,
      key,
      value: parsedValue,
      expires_at: expires_at || null,
      notes: notes || null,
      created_by: me.id,
    });
    if (error) return { ok: false as const, error: error.message };
  }

  const h = await headers();
  await supabase.from("audit_log").insert({
    org_id: org_id ?? null,
    actor_id: me.id,
    actor_type: "platform_admin",
    action: existing ? "feature_flag.updated" : "feature_flag.created",
    entity_type: "feature_flag",
    entity_id: null,
    payload: { key, value: parsedValue, admin_email: me.email },
    ip: h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    user_agent: h.get("user-agent") ?? null,
  });

  revalidatePath("/admin/feature-flags");
  return { ok: true as const };
}

const deleteSchema = z.object({ id: z.string().uuid() });

export async function deleteFeatureFlagAction(input: z.infer<typeof deleteSchema>) {
  const parsed = deleteSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: "ID inválido" };
  }
  const { me, supabase } = await assertPlatformAdminAndGetAdminClient();

  const { data: flag } = await supabase
    .from("feature_flags")
    .select("id, org_id, key")
    .eq("id", parsed.data.id)
    .maybeSingle();
  if (!flag) return { ok: false as const, error: "Flag não encontrada" };
  const flagTyped = flag as { id: string; org_id: string | null; key: string };

  const { error } = await supabase.from("feature_flags").delete().eq("id", parsed.data.id);
  if (error) return { ok: false as const, error: error.message };

  const h = await headers();
  await supabase.from("audit_log").insert({
    org_id: flagTyped.org_id,
    actor_id: me.id,
    actor_type: "platform_admin",
    action: "feature_flag.deleted",
    entity_type: "feature_flag",
    entity_id: parsed.data.id,
    payload: { key: flagTyped.key, admin_email: me.email },
    ip: h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    user_agent: h.get("user-agent") ?? null,
  });

  revalidatePath("/admin/feature-flags");
  return { ok: true as const };
}
