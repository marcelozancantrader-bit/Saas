"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { assertPortalAccess } from "@/server/services/portal-loader";
import { notify } from "@/server/services/notifications";

const schema = z.object({
  token: z.string().uuid(),
  project_id: z.string().uuid(),
  descricao: z.string().min(10).max(4000),
  urgencia: z.enum(["baixa", "media", "alta"]).default("media"),
});

export type RequestScopeChangeInput = z.infer<typeof schema>;
export type RequestScopeChangeResult = { ok: true; id: string } | { ok: false; error: string };

function ipFromHeaders(h: Headers): string | null {
  const xff = h.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();
  return h.get("x-real-ip");
}

export async function requestScopeChangeAction(
  raw: RequestScopeChangeInput,
): Promise<RequestScopeChangeResult> {
  const parsed = schema.safeParse(raw);
  if (!parsed.success)
    return { ok: false, error: "Dados inválidos: " + parsed.error.issues[0]!.message };

  const access = await assertPortalAccess(parsed.data.token, parsed.data.project_id);
  if (!access.ok) return { ok: false, error: "Acesso negado ao portal." };

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("scope_changes")
    .insert({
      project_id: parsed.data.project_id,
      solicitado_por: "cliente",
      descricao: parsed.data.descricao,
      urgencia: parsed.data.urgencia,
      status: "pendente_analise",
    })
    .select("id")
    .single();
  if (error || !data) return { ok: false, error: error?.message ?? "Falha." };

  const h = await headers();
  await admin.from("audit_log").insert({
    org_id: access.orgId,
    actor_type: "client_portal",
    action: "scope_change.requested",
    entity_type: "scope_change",
    entity_id: data.id,
    payload: { descricao: parsed.data.descricao, urgencia: parsed.data.urgencia },
    ip: ipFromHeaders(h),
    user_agent: h.get("user-agent"),
  });

  await notify({
    org_id: access.orgId,
    type: "scope_change.requested",
    title: "Cliente solicitou alteração de escopo",
    body:
      parsed.data.descricao.length > 140
        ? parsed.data.descricao.slice(0, 137) + "…"
        : parsed.data.descricao,
    link_url: `/projetos/${parsed.data.project_id}`,
    meta: { scope_change_id: data.id, urgencia: parsed.data.urgencia },
  });

  revalidatePath(`/portal/${parsed.data.token}`);
  revalidatePath(`/projetos/${parsed.data.project_id}`);
  return { ok: true, id: data.id as string };
}
