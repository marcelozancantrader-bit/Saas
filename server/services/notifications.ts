import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Sprint 7 — criação de notificações in-app. Toda escrita aqui é via service-role
 * porque é chamada de ações que podem rodar como `client_portal` (sem JWT).
 */

export type NotifyInput = {
  org_id: string;
  user_id?: string | null; // null = visível para todos da org
  type:
    | "document.approved"
    | "document.rejected"
    | "scope_change.requested"
    | "scope_change.responded"
    | "scope_change.approved"
    | "scope_change.rejected"
    | "project.stale"
    | "document.awaiting_long"
    | "plan.upgraded";
  title: string;
  body?: string;
  link_url?: string;
  meta?: Record<string, unknown>;
};

export async function notify(input: NotifyInput): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin.from("notifications").insert({
    org_id: input.org_id,
    user_id: input.user_id ?? null,
    type: input.type,
    title: input.title,
    body: input.body ?? null,
    link_url: input.link_url ?? null,
    meta: input.meta ?? {},
  });
  if (error) {
    console.warn(`[notifications] failed to insert ${input.type}: ${error.message}`);
  }
}
