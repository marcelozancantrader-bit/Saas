"use server";

import { z } from "zod";
import { assertPlatformAdminAndGetAdminClient } from "@/lib/auth/platform-admin";
import { runAutomation } from "@/lib/automations/engine";
import {
  automationGraphSchema,
  triggerSchema,
  type AdminAutomation,
} from "@/lib/automations/types";

const schema = z.object({
  id: z.string().uuid(),
  /** Payload mock JSON pra simular o trigger. */
  payload: z.record(z.string(), z.unknown()),
});

export type TestRunResult =
  | { ok: true; status: "success" | "failed"; steps: unknown[] }
  | { ok: false; error: string };

/**
 * Roda uma automation com payload mock SEM persistir em admin_automation_runs.
 * Usado pelo botão "Testar" no editor pra debug rápido.
 *
 * Limita wait_delay a 5s (configurado no handler) pra não travar UI.
 */
export async function testRunAutomationAction(raw: z.infer<typeof schema>): Promise<TestRunResult> {
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Dados inválidos." };

  const { supabase } = await assertPlatformAdminAndGetAdminClient();

  const { data: auto, error } = await supabase
    .from("admin_automations")
    .select("*")
    .eq("id", parsed.data.id)
    .maybeSingle();
  if (error || !auto) return { ok: false, error: "Automation não encontrada." };

  const graphParsed = automationGraphSchema.safeParse(auto.graph);
  const triggerParsed = triggerSchema.safeParse(auto.trigger);
  if (!graphParsed.success || !triggerParsed.success) {
    return { ok: false, error: "Graph ou trigger corrompido." };
  }

  const automation: AdminAutomation = {
    ...(auto as AdminAutomation),
    trigger: triggerParsed.data,
    graph: graphParsed.data,
  };

  const result = await runAutomation(automation, {
    admin: supabase,
    payload: parsed.data.payload,
    // Sem step.sleep — wait_delay degrada pra setTimeout 5s max no handler
  });

  return { ok: true, status: result.status, steps: result.steps };
}
