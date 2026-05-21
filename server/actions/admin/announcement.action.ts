"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";
import { assertPlatformAdminAndGetAdminClient } from "@/lib/auth/platform-admin";

const createSchema = z.object({
  title: z.string().min(3).max(200),
  body: z.string().min(3).max(2000),
  severity: z.enum(["info", "success", "warning", "error"]),
  audience: z.string().min(1).max(80), // all | paid | plan:standard | org:<uuid>
  link_url: z.string().url().optional().nullable().or(z.literal("")),
  starts_at: z.string().optional().nullable(),
  expires_at: z.string().optional().nullable(),
});

export async function createAnnouncementAction(input: z.infer<typeof createSchema>) {
  const parsed = createSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }
  const v = parsed.data;
  const { me, supabase } = await assertPlatformAdminAndGetAdminClient();

  const { error } = await supabase.from("announcements").insert({
    title: v.title,
    body: v.body,
    severity: v.severity,
    audience: v.audience,
    link_url: v.link_url || null,
    starts_at: v.starts_at ? new Date(v.starts_at).toISOString() : new Date().toISOString(),
    expires_at: v.expires_at ? new Date(v.expires_at).toISOString() : null,
    is_active: true,
    created_by: me.id,
  });
  if (error) return { ok: false as const, error: error.message };

  const h = await headers();
  await supabase.from("audit_log").insert({
    org_id: null,
    actor_id: me.id,
    actor_type: "platform_admin",
    action: "announcement.created",
    entity_type: "announcement",
    entity_id: null,
    payload: { title: v.title, severity: v.severity, audience: v.audience, admin_email: me.email },
    ip: h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    user_agent: h.get("user-agent") ?? null,
  });

  revalidatePath("/admin/announcements");
  return { ok: true as const };
}

const toggleSchema = z.object({ id: z.string().uuid(), is_active: z.boolean() });

export async function toggleAnnouncementAction(input: z.infer<typeof toggleSchema>) {
  const parsed = toggleSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Dados inválidos" };

  const { me, supabase } = await assertPlatformAdminAndGetAdminClient();

  const { error } = await supabase
    .from("announcements")
    .update({ is_active: parsed.data.is_active })
    .eq("id", parsed.data.id);
  if (error) return { ok: false as const, error: error.message };

  const h = await headers();
  await supabase.from("audit_log").insert({
    org_id: null,
    actor_id: me.id,
    actor_type: "platform_admin",
    action: parsed.data.is_active ? "announcement.activated" : "announcement.deactivated",
    entity_type: "announcement",
    entity_id: parsed.data.id,
    payload: { admin_email: me.email },
    ip: h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    user_agent: h.get("user-agent") ?? null,
  });

  revalidatePath("/admin/announcements");
  return { ok: true as const };
}
