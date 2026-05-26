import "server-only";
import { inngest } from "@/lib/inngest/client";
import { createAdminClient } from "@/lib/supabase/admin";
import { runAutomation } from "@/lib/automations/engine";
import {
  automationGraphSchema,
  triggerSchema,
  type AdminAutomation,
  type RunStep,
} from "@/lib/automations/types";

/**
 * Inngest function que escuta TODOS os eventos publicados via publishAdminEvent.
 *
 * Pra cada evento "admin/event.fired":
 *   1. Busca automations enabled=true com trigger.type === payload.event
 *   2. Pra cada match: cria run em admin_automation_runs, executa engine,
 *      persiste resultado, atualiza last_run_at + run_count
 *   3. Retorna sumário { processed, success, failed }
 *
 * Retries 2x em caso de falha catastrófica do próprio runner (não erros de
 * actions individuais — esses ficam capturados em RunStep[]).
 */
export const adminAutomationRunner = inngest.createFunction(
  {
    id: "admin-automation-runner",
    name: "Builder de automações admin",
    retries: 2,
    concurrency: { limit: 20 },
    triggers: [{ event: "admin/event.fired" }],
  },
  async ({ event, step, logger }) => {
    const data = event.data as {
      event: string;
      payload: Record<string, unknown>;
      timestamp: string;
    };

    const admin = createAdminClient();

    // 1. Busca automations matching o trigger
    const automations = await step.run("fetch-matching", async () => {
      const { data: rows, error } = await admin
        .from("admin_automations")
        .select("*")
        .eq("enabled", true)
        .filter("trigger->>type", "eq", data.event);
      if (error) throw new Error(`Query automations: ${error.message}`);
      return (rows ?? []) as AdminAutomation[];
    });

    if (automations.length === 0) {
      return { event: data.event, processed: 0 };
    }

    logger.info(`[admin-automation] event="${data.event}" matched ${automations.length}`);

    let success = 0;
    let failed = 0;

    for (const auto of automations) {
      // Valida graph antes de executar (defesa contra dados corrompidos)
      const graphValid = automationGraphSchema.safeParse(auto.graph);
      const triggerValid = triggerSchema.safeParse(auto.trigger);
      if (!graphValid.success || !triggerValid.success) {
        await admin.from("admin_automation_runs").insert({
          automation_id: auto.id,
          triggered_by: data.event,
          trigger_payload: data.payload,
          status: "failed",
          steps: [
            {
              node_id: "_root",
              action_type: "engine",
              status: "failed",
              error: "graph ou trigger inválido (schema zod)",
              duration_ms: 0,
            } satisfies RunStep,
          ],
          completed_at: new Date().toISOString(),
        });
        failed++;
        continue;
      }

      const automationParsed: AdminAutomation = {
        ...auto,
        trigger: triggerValid.data,
        graph: graphValid.data,
      };

      // Cria run row em running
      const startedAt = new Date().toISOString();
      const { data: runRow, error: insErr } = await admin
        .from("admin_automation_runs")
        .insert({
          automation_id: auto.id,
          triggered_by: data.event,
          trigger_payload: data.payload,
          status: "running",
          started_at: startedAt,
        })
        .select("id")
        .single<{ id: string }>();
      if (insErr || !runRow) {
        logger.error(`[admin-automation] falha criando run row: ${insErr?.message}`);
        failed++;
        continue;
      }

      // Executa engine
      const result = await step.run(`exec-${auto.id}`, async () => {
        return runAutomation(automationParsed, {
          admin,
          payload: data.payload,
          step: { sleep: (id, dur) => step.sleep(id, dur) },
        });
      });

      // Persiste resultado
      await admin
        .from("admin_automation_runs")
        .update({
          status: result.status,
          steps: result.steps,
          completed_at: new Date().toISOString(),
        })
        .eq("id", runRow.id);

      await admin
        .from("admin_automations")
        .update({
          last_run_at: new Date().toISOString(),
          run_count: (auto.run_count ?? 0) + 1,
          updated_at: new Date().toISOString(),
        })
        .eq("id", auto.id);

      if (result.status === "success") success++;
      else failed++;
    }

    return { event: data.event, processed: automations.length, success, failed };
  },
);
