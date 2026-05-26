import "server-only";
import { inngest } from "@/lib/inngest/client";
import { createAdminClient } from "@/lib/supabase/admin";
import { publishAdminEvent } from "@/lib/automations/publish";
import { computeMetric, isKnownMetric } from "@/lib/automations/metrics";
import { METRIC_CATALOG } from "@/lib/automations/metrics-catalog";
import { metricThresholdConfigSchema, type AdminAutomation } from "@/lib/automations/types";

/**
 * Cron a cada 15 min — avalia todas as automations enabled=true com
 * trigger.type='metric.threshold'.
 *
 * Pra cada uma:
 *   1. Lê config (metric, op, threshold, cooldown_minutes)
 *   2. Computa valor atual da métrica
 *   3. Se a condição passa AND cooldown expirou → publishAdminEvent
 *   4. Atualiza meta com last_metric_value / last_checked_at / last_fired_at
 *
 * Como funciona o cooldown: depois de disparar, a automation fica em
 * "pausa lógica" por X minutos (default 60). Antes disso, mesmo que a
 * condição continue verdadeira, não dispara. Evita 96 alertas/dia quando
 * uma métrica fica acima do threshold permanentemente.
 *
 * Métricas são agregadas uma vez por execução do cron e reutilizadas entre
 * automations que compartilham o mesmo metric.id — economia de queries.
 */
export const metricThresholdCron = inngest.createFunction(
  {
    id: "metric-threshold-cron",
    name: "Avaliar metric.threshold a cada 15 min",
    retries: 1,
    triggers: [{ cron: "*/15 * * * *" }],
  },
  async ({ step, logger }) => {
    const admin = createAdminClient();

    const automations = await step.run("fetch", async () => {
      const { data, error } = await admin
        .from("admin_automations")
        .select("*")
        .eq("enabled", true)
        .filter("trigger->>type", "eq", "metric.threshold");
      if (error) throw new Error(`fetch automations: ${error.message}`);
      return (data ?? []) as AdminAutomation[];
    });

    if (automations.length === 0) {
      return { evaluated: 0, fired: 0 };
    }

    logger.info(`[metric-threshold] avaliando ${automations.length} automations`);

    // Cache de valores por métrica (evita recomputar)
    const metricValues = new Map<string, number>();
    const now = new Date();
    const nowIso = now.toISOString();
    let fired = 0;
    let skippedCooldown = 0;
    let skippedConfig = 0;
    let skippedNotMatched = 0;

    for (const auto of automations) {
      // Valida config do trigger
      const triggerConfig = (auto.trigger as { config?: unknown })?.config ?? {};
      const parsed = metricThresholdConfigSchema.safeParse(triggerConfig);
      if (!parsed.success) {
        logger.warn(`[metric-threshold] config inválida em ${auto.id}: ${parsed.error.message}`);
        skippedConfig++;
        continue;
      }
      const { metric, op, threshold, cooldown_minutes } = parsed.data;

      if (!isKnownMetric(metric)) {
        logger.warn(`[metric-threshold] métrica desconhecida em ${auto.id}: ${metric}`);
        skippedConfig++;
        continue;
      }

      // Cooldown
      const meta = (auto.meta as { last_fired_at?: string } | null) ?? {};
      if (meta.last_fired_at && cooldown_minutes > 0) {
        const lastFired = new Date(meta.last_fired_at).getTime();
        const minutesSince = (now.getTime() - lastFired) / 60_000;
        if (minutesSince < cooldown_minutes) {
          skippedCooldown++;
          continue;
        }
      }

      // Computa (cacheado)
      let value: number;
      if (metricValues.has(metric)) {
        value = metricValues.get(metric)!;
      } else {
        try {
          value = await computeMetric(metric, admin);
          metricValues.set(metric, value);
        } catch (err) {
          logger.error(
            `[metric-threshold] erro computando "${metric}" pra ${auto.id}: ${
              err instanceof Error ? err.message : String(err)
            }`,
          );
          skippedConfig++;
          continue;
        }
      }

      // Sempre atualiza last_metric_value (visibilidade)
      const newMeta: Record<string, unknown> = {
        ...meta,
        last_metric_value: value,
        last_checked_at: nowIso,
      };

      const matches = matchOperator(value, op, threshold);
      if (!matches) {
        skippedNotMatched++;
        await admin.from("admin_automations").update({ meta: newMeta }).eq("id", auto.id);
        continue;
      }

      // Match! Dispara
      const entry = METRIC_CATALOG[metric];
      await publishAdminEvent("metric.threshold", {
        automation_id: auto.id,
        automation_name: auto.name,
        metric,
        metric_label: entry?.label ?? metric,
        unit: entry?.unit ?? "count",
        op,
        threshold,
        value,
        checked_at: nowIso,
      });

      newMeta.last_fired_at = nowIso;
      await admin.from("admin_automations").update({ meta: newMeta }).eq("id", auto.id);
      fired++;
    }

    return {
      evaluated: automations.length,
      fired,
      skippedCooldown,
      skippedConfig,
      skippedNotMatched,
    };
  },
);

function matchOperator(value: number, op: string, threshold: number): boolean {
  switch (op) {
    case "gt":
      return value > threshold;
    case "gte":
      return value >= threshold;
    case "lt":
      return value < threshold;
    case "lte":
      return value <= threshold;
    case "eq":
      return value === threshold;
    default:
      return false;
  }
}
