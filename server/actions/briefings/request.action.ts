"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentOrg } from "@/server/services/current-org";
import { notify } from "@/server/services/notifications";

const schema = z.object({ project_id: z.string().uuid() });

export type RequestBriefingResult =
  | { ok: true; portal_url: string | null }
  | { ok: false; error: string };

/**
 * D7 — escritório cria/reabre o briefing para o cliente preencher.
 *
 * Idempotente: se já existe um briefing pra esse projeto, reseta para
 * 'aguardando_cliente' e atualiza enviado_em. Caso a UI permita reenviar,
 * isso evita criar dois registros.
 *
 * Retorna o portal_url com o token do cliente para o profissional copiar.
 */
export async function requestBriefingAction(
  raw: z.infer<typeof schema>,
): Promise<RequestBriefingResult> {
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Dados inválidos." };

  const supabase = await createClient();
  const me = await getCurrentOrg();

  // Garante que o projeto pertence à org do user (RLS faria isso, mas explicito é melhor)
  const { data: project, error: pErr } = await supabase
    .from("projects")
    .select("id, org_id, clients ( portal_token )")
    .eq("id", parsed.data.project_id)
    .single<{
      id: string;
      org_id: string;
      clients: { portal_token: string } | null;
    }>();
  if (pErr || !project) return { ok: false, error: "Projeto não encontrado." };
  if (project.org_id !== me.orgId) return { ok: false, error: "Acesso negado." };

  const admin = createAdminClient();

  // Upsert: 1:1 com project_id (constraint UNIQUE)
  const { error } = await admin
    .from("briefings")
    .upsert(
      {
        project_id: parsed.data.project_id,
        status: "aguardando_cliente",
        enviado_em: new Date().toISOString(),
        // Se já houve preenchimento antes, NÃO sobrescrevemos respostas — só status
        updated_at: new Date().toISOString(),
      },
      { onConflict: "project_id" },
    )
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };

  // Notification interna (avisa o time do escritório que o briefing foi solicitado)
  await notify({
    org_id: me.orgId,
    type: "scope_change.requested",
    title: "Briefing enviado ao cliente",
    body: "O briefing aguarda preenchimento no portal do cliente.",
    link_url: `/projetos/${parsed.data.project_id}`,
  });

  const portalUrl = project.clients?.portal_token
    ? `/portal/${project.clients.portal_token}`
    : null;

  revalidatePath(`/projetos/${parsed.data.project_id}`);
  if (portalUrl) revalidatePath(portalUrl);
  return { ok: true, portal_url: portalUrl };
}
