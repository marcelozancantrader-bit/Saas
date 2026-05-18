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
  scope_change_id: z.string().uuid(),
  decisao: z.enum(["aprovado", "recusado"]),
  assinatura_data_url: z.string().regex(/^data:image\/(png|jpeg);base64,/),
});

export type ApproveScopeChangeInput = z.infer<typeof schema>;
export type ApproveScopeChangeResult = { ok: true } | { ok: false; error: string };

function ipFromHeaders(h: Headers): string | null {
  const xff = h.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();
  return h.get("x-real-ip");
}

export async function approveScopeChangeAction(
  raw: ApproveScopeChangeInput,
): Promise<ApproveScopeChangeResult> {
  const parsed = schema.safeParse(raw);
  if (!parsed.success)
    return { ok: false, error: "Dados inválidos: " + parsed.error.issues[0]!.message };

  const access = await assertPortalAccess(parsed.data.token, parsed.data.project_id);
  if (!access.ok) return { ok: false, error: "Acesso negado ao portal." };

  const admin = createAdminClient();
  const { data: sc, error: scErr } = await admin
    .from("scope_changes")
    .select("id, project_id, status, aprovacao_meta")
    .eq("id", parsed.data.scope_change_id)
    .eq("project_id", parsed.data.project_id)
    .maybeSingle();
  if (scErr) return { ok: false, error: scErr.message };
  if (!sc) return { ok: false, error: "Alteração não encontrada." };
  if (sc.status !== "aguardando_cliente")
    return { ok: false, error: "Esta alteração não está aguardando sua aprovação." };

  const h = await headers();
  const aprovacao_meta = {
    decisao: parsed.data.decisao,
    assinatura_data_url: parsed.data.assinatura_data_url,
    ip: ipFromHeaders(h),
    user_agent: h.get("user-agent"),
    timestamp: new Date().toISOString(),
  };

  const { error: upErr } = await admin
    .from("scope_changes")
    .update({
      status: parsed.data.decisao,
      aprovacao_meta,
      resolvido_em: new Date().toISOString(),
    })
    .eq("id", parsed.data.scope_change_id);
  if (upErr) return { ok: false, error: upErr.message };

  await admin.from("audit_log").insert({
    org_id: access.orgId,
    actor_type: "client_portal",
    action: parsed.data.decisao === "aprovado" ? "scope_change.approved" : "scope_change.rejected",
    entity_type: "scope_change",
    entity_id: parsed.data.scope_change_id,
    payload: {},
    ip: aprovacao_meta.ip,
    user_agent: aprovacao_meta.user_agent,
  });

  await notify({
    org_id: access.orgId,
    type: parsed.data.decisao === "aprovado" ? "scope_change.approved" : "scope_change.rejected",
    title:
      parsed.data.decisao === "aprovado"
        ? "Cliente aprovou um aditivo"
        : "Cliente recusou um aditivo",
    link_url: `/projetos/${parsed.data.project_id}`,
    meta: { scope_change_id: parsed.data.scope_change_id },
  });

  revalidatePath(`/portal/${parsed.data.token}`);
  revalidatePath(`/projetos/${parsed.data.project_id}`);
  return { ok: true };
}
