"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { assertPlatformAdminAndGetAdminClient } from "@/lib/auth/platform-admin";
import {
  automationGraphSchema,
  triggerSchema,
  type AdminAutomation,
} from "@/lib/automations/types";
import { snapshotAutomationVersion } from "@/server/services/automation-versions";

const schema = z.object({
  automation_id: z.string().uuid(),
  version_id: z.string().uuid(),
});

export type RestoreVersionResult = { ok: true } | { ok: false; error: string };

/**
 * Restaura uma versão antiga: copia name/description/trigger/graph dela pro
 * registro atual de admin_automations. Cria um novo snapshot DO ESTADO ATUAL
 * antes de sobrescrever (pra poder voltar atrás).
 *
 * Não restaura `enabled` nem `meta` — preserva estado operacional vigente.
 */
export async function restoreAutomationVersionAction(
  raw: z.infer<typeof schema>,
): Promise<RestoreVersionResult> {
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const { me, supabase } = await assertPlatformAdminAndGetAdminClient();

  const { data: version, error: vErr } = await supabase
    .from("admin_automation_versions")
    .select("*")
    .eq("id", parsed.data.version_id)
    .eq("automation_id", parsed.data.automation_id)
    .maybeSingle();
  if (vErr || !version) {
    return { ok: false, error: vErr?.message ?? "Versão não encontrada." };
  }

  const triggerParsed = triggerSchema.safeParse(version.trigger);
  const graphParsed = automationGraphSchema.safeParse(version.graph);
  if (!triggerParsed.success || !graphParsed.success) {
    return { ok: false, error: "Versão inválida (schema)." };
  }

  // Lê estado atual pra snapshotar antes de sobrescrever
  const { data: current, error: cErr } = await supabase
    .from("admin_automations")
    .select("*")
    .eq("id", parsed.data.automation_id)
    .maybeSingle();
  if (cErr || !current) {
    return { ok: false, error: cErr?.message ?? "Automation não encontrada." };
  }
  const currentTyped = current as AdminAutomation;
  const currentTriggerParsed = triggerSchema.safeParse(current.trigger);
  const currentGraphParsed = automationGraphSchema.safeParse(current.graph);

  // Snapshot do estado atual (best-effort)
  try {
    if (currentTriggerParsed.success && currentGraphParsed.success) {
      await snapshotAutomationVersion({
        admin: supabase,
        automationId: parsed.data.automation_id,
        createdBy: me.id,
        previous: {
          name: currentTyped.name,
          description: currentTyped.description,
          trigger: currentTriggerParsed.data,
          graph: currentGraphParsed.data,
        },
        next: {
          name: version.name as string,
          description: (version.description as string | null) ?? null,
          trigger: triggerParsed.data,
          graph: graphParsed.data,
        },
      });
    }
  } catch (err) {
    console.warn(
      `[restore-version] snapshot do estado atual falhou: ${
        err instanceof Error ? err.message : String(err)
      }`,
    );
  }

  // Aplica restore
  const { error: upErr } = await supabase
    .from("admin_automations")
    .update({
      name: version.name,
      description: version.description,
      trigger: triggerParsed.data,
      graph: graphParsed.data,
      updated_at: new Date().toISOString(),
    })
    .eq("id", parsed.data.automation_id);
  if (upErr) return { ok: false, error: upErr.message };

  revalidatePath("/admin/automacoes");
  revalidatePath(`/admin/automacoes/${parsed.data.automation_id}`);
  revalidatePath(`/admin/automacoes/${parsed.data.automation_id}/versoes`);
  return { ok: true };
}
