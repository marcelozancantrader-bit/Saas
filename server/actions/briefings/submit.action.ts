"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { assertPortalAccess } from "@/server/services/portal-loader";
import { notify } from "@/server/services/notifications";
import { briefingRespostasSchema } from "@/lib/validators/briefing.schema";

const schema = z.object({
  token: z.string().uuid(),
  project_id: z.string().uuid(),
  respostas: briefingRespostasSchema,
});

export type SubmitBriefingResult = { ok: true } | { ok: false; error: string };

function ipFromHeaders(h: Headers): string | null {
  const xff = h.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();
  return h.get("x-real-ip");
}

/**
 * D7 — cliente do portal preenche o briefing.
 *
 * Valida portal_token + project_id, captura IP/UA para auditoria, transiciona
 * de 'aguardando_cliente' para 'preenchido' e dispara notification pro
 * escritório.
 */
export async function submitBriefingAction(
  raw: z.infer<typeof schema>,
): Promise<SubmitBriefingResult> {
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const access = await assertPortalAccess(parsed.data.token, parsed.data.project_id);
  if (!access.ok) return { ok: false, error: "Acesso negado ao portal." };

  const admin = createAdminClient();
  const h = await headers();
  const now = new Date().toISOString();

  // Garante que existe briefing aguardando — não permitimos overwrite de preenchido sem reabrir.
  const { data: existing, error: selErr } = await admin
    .from("briefings")
    .select("id, status")
    .eq("project_id", parsed.data.project_id)
    .maybeSingle();
  if (selErr) return { ok: false, error: selErr.message };
  if (!existing || existing.status !== "aguardando_cliente") {
    return {
      ok: false,
      error: "Não há briefing aguardando preenchimento. Peça ao profissional para reabrir.",
    };
  }

  const { error: upErr } = await admin
    .from("briefings")
    .update({
      respostas: parsed.data.respostas,
      status: "preenchido",
      preenchido_em: now,
      ip: ipFromHeaders(h),
      user_agent: h.get("user-agent"),
      updated_at: now,
    })
    .eq("id", existing.id);
  if (upErr) return { ok: false, error: upErr.message };

  await notify({
    org_id: access.orgId,
    type: "scope_change.responded",
    title: "Cliente preencheu o briefing",
    body: "Acesse o projeto para revisar as respostas.",
    link_url: `/projetos/${parsed.data.project_id}`,
    meta: { project_id: parsed.data.project_id },
  });

  revalidatePath(`/portal/${parsed.data.token}`);
  revalidatePath(`/projetos/${parsed.data.project_id}`);
  return { ok: true };
}
