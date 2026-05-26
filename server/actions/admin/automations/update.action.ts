"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { assertPlatformAdminAndGetAdminClient } from "@/lib/auth/platform-admin";
import {
  automationGraphSchema,
  triggerSchema,
  type AdminAutomation,
  type AutomationGraph,
  type Trigger,
} from "@/lib/automations/types";
import { snapshotAutomationVersion } from "@/server/services/automation-versions";

const schema = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(2).max(120).optional(),
  description: z.string().trim().max(500).optional().or(z.literal("")),
  graph: automationGraphSchema.optional(),
});

export type UpdateAutomationResult = { ok: true } | { ok: false; error: string };

/**
 * Atualiza graph/nome/descrição.
 *
 * - Quando `graph` é fornecido, deriva `trigger.config` do nó trigger no graph
 *   (mantém os dois lados em sync — runner usa admin_automations.trigger->>type
 *   pra filtrar matching, cron de metric.threshold usa trigger->>config).
 *
 * - Snapshot de versão é criado quando graph, trigger.config, name ou
 *   description mudam materialmente vs última versão.
 */
export async function updateAutomationAction(
  raw: z.infer<typeof schema>,
): Promise<UpdateAutomationResult> {
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  const { me, supabase } = await assertPlatformAdminAndGetAdminClient();

  // Lê estado atual pra detectar mudanças materiais + sync trigger.config
  const { data: current, error: readErr } = await supabase
    .from("admin_automations")
    .select("*")
    .eq("id", parsed.data.id)
    .maybeSingle();
  if (readErr || !current) {
    return { ok: false, error: readErr?.message ?? "Automation não encontrada." };
  }

  const triggerParsed = triggerSchema.safeParse(current.trigger);
  if (!triggerParsed.success) {
    return { ok: false, error: "Trigger inválido no banco." };
  }
  let nextTrigger: Trigger = triggerParsed.data;
  let nextGraph: AutomationGraph | null = null;

  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (parsed.data.name !== undefined) updates.name = parsed.data.name;
  if (parsed.data.description !== undefined) {
    updates.description = parsed.data.description || null;
  }
  if (parsed.data.graph !== undefined) {
    updates.graph = parsed.data.graph;
    nextGraph = parsed.data.graph;

    // Sync trigger.config a partir do nó trigger
    const triggerNode = parsed.data.graph.nodes.find((n) => n.data.kind === "trigger");
    if (triggerNode) {
      const newConfig = triggerNode.data.config ?? {};
      const oldConfig = nextTrigger.config ?? {};
      const changed = JSON.stringify(newConfig) !== JSON.stringify(oldConfig);
      if (changed) {
        nextTrigger = { type: nextTrigger.type, config: newConfig };
        updates.trigger = nextTrigger;
      }
    }
  }

  const { error: updErr } = await supabase
    .from("admin_automations")
    .update(updates)
    .eq("id", parsed.data.id);
  if (updErr) return { ok: false, error: updErr.message };

  // Snapshot best-effort (não bloqueia se falhar)
  try {
    const currentTyped = current as AdminAutomation;
    await snapshotAutomationVersion({
      admin: supabase,
      automationId: parsed.data.id,
      createdBy: me.id,
      previous: {
        name: currentTyped.name,
        description: currentTyped.description,
        trigger: triggerParsed.data,
        graph:
          automationGraphSchema.safeParse(current.graph).data ??
          ({ nodes: [], edges: [] } as AutomationGraph),
      },
      next: {
        name: (updates.name as string | undefined) ?? currentTyped.name,
        description:
          parsed.data.description !== undefined
            ? parsed.data.description || null
            : currentTyped.description,
        trigger: nextTrigger,
        graph: nextGraph ??
          automationGraphSchema.safeParse(current.graph).data ?? {
            nodes: [],
            edges: [],
          },
      },
    });
  } catch (err) {
    // versionamento é melhor-esforço; log mas não falha
    console.warn(
      `[updateAutomation] snapshot version falhou: ${
        err instanceof Error ? err.message : String(err)
      }`,
    );
  }

  revalidatePath("/admin/automacoes");
  revalidatePath(`/admin/automacoes/${parsed.data.id}`);
  revalidatePath(`/admin/automacoes/${parsed.data.id}/versoes`);
  return { ok: true };
}
