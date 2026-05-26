/**
 * Tipos compartilhados do builder de automações admin (P16).
 *
 * Não importa nada de server — pode ser usado no cliente (editor React Flow)
 * e no servidor (engine, actions).
 */

import { z } from "zod";

// =============================================================================
// TRIGGERS
// =============================================================================

export const TRIGGER_TYPES = [
  "signup.created",
  "subscription.upgraded",
  "subscription.canceled",
  "document.generated",
  "payment.received",
  "payment.overdue",
  "payment.refunded",
  "error.captured",
  "schedule.daily",
  "metric.threshold",
] as const;

export type TriggerType = (typeof TRIGGER_TYPES)[number];

export const triggerSchema = z.object({
  type: z.enum(TRIGGER_TYPES),
  /** Config livre por tipo (ex: schedule.daily não tem; signup pode filtrar por plano). */
  config: z.record(z.string(), z.unknown()).default({}),
});

export type Trigger = z.infer<typeof triggerSchema>;

// =============================================================================
// ACTIONS
// =============================================================================

export const ACTION_TYPES = [
  "send_email_admin",
  "send_slack",
  "send_telegram",
  "mark_org_meta",
  "webhook_post",
  "create_audit_entry",
  "wait_delay",
  "if_condition",
] as const;

export type ActionType = (typeof ACTION_TYPES)[number];

// Schemas de config por action — usados pra gerar form dinâmico no editor.

export const sendEmailAdminConfigSchema = z.object({
  subject: z.string().min(1).max(200),
  body: z.string().min(1).max(4000),
});

export const sendSlackConfigSchema = z.object({
  text: z.string().min(1).max(2000),
});

export const sendTelegramConfigSchema = z.object({
  text: z.string().min(1).max(4000),
});

export const markOrgMetaConfigSchema = z.object({
  /** Path do org_id no payload (ex: "org.id" ou "subscription.org_id"). */
  org_id_path: z.string().min(1),
  key: z.string().min(1).max(60),
  value: z.string().max(500),
});

export const webhookPostConfigSchema = z.object({
  url: z.string().url(),
  body_template: z.string().min(1).max(4000),
});

export const createAuditEntryConfigSchema = z.object({
  action: z.string().min(1).max(80),
  entity_type: z.string().min(1).max(40),
  entity_id_path: z.string().optional(),
});

export const waitDelayConfigSchema = z.object({
  seconds: z.number().int().min(1).max(86400),
});

export const ifConditionConfigSchema = z.object({
  /** Path do valor no payload (ex: "org.plano", "amount"). */
  path: z.string().min(1),
  op: z.enum(["eq", "ne", "gt", "gte", "lt", "lte", "contains"]),
  /** Valor a comparar. String — se for número, parse no runtime. */
  value: z.string(),
});

// =============================================================================
// TRIGGER CONFIGS — schemas específicos por tipo de trigger
// =============================================================================

export const metricThresholdConfigSchema = z.object({
  /** Chave em METRIC_CATALOG (lib/automations/metrics.ts). */
  metric: z.string().min(1).max(80),
  op: z.enum(["gt", "gte", "lt", "lte", "eq"]),
  threshold: z.number(),
  /** Tempo mínimo entre disparos consecutivos (anti-spam). Default 60. */
  cooldown_minutes: z.number().int().min(0).max(1440).default(60),
});

export type MetricThresholdConfig = z.infer<typeof metricThresholdConfigSchema>;

// =============================================================================
// AUTOMATION GRAPH (React Flow)
// =============================================================================

export const nodeKindSchema = z.enum(["trigger", "action", "condition"]);
export type NodeKind = z.infer<typeof nodeKindSchema>;

export const automationNodeSchema = z.object({
  id: z.string(),
  type: z.string(), // matches React Flow custom node type name
  position: z.object({ x: z.number(), y: z.number() }),
  data: z.object({
    kind: nodeKindSchema,
    /** TriggerType pra kind=trigger; ActionType pra action/condition. */
    actionType: z.string(),
    label: z.string().optional(),
    /** Config específica do action/trigger (forma varia por tipo). */
    config: z.record(z.string(), z.unknown()).default({}),
  }),
});

export type AutomationNode = z.infer<typeof automationNodeSchema>;

export const automationEdgeSchema = z.object({
  id: z.string(),
  source: z.string(),
  target: z.string(),
  /** Pra if_condition: "true" ou "false". Outros: undefined. */
  sourceHandle: z.string().optional().nullable(),
  targetHandle: z.string().optional().nullable(),
});

export type AutomationEdge = z.infer<typeof automationEdgeSchema>;

export const automationGraphSchema = z.object({
  nodes: z.array(automationNodeSchema),
  edges: z.array(automationEdgeSchema),
});

export type AutomationGraph = z.infer<typeof automationGraphSchema>;

// =============================================================================
// RUN STEPS (histórico de execução)
// =============================================================================

export const runStepSchema = z.object({
  node_id: z.string(),
  action_type: z.string(),
  status: z.enum(["success", "failed", "skipped"]),
  output: z.unknown().optional(),
  error: z.string().optional(),
  duration_ms: z.number().int(),
});

export type RunStep = z.infer<typeof runStepSchema>;

// =============================================================================
// AUTOMATION ROW (do banco)
// =============================================================================

export type AdminAutomation = {
  id: string;
  name: string;
  description: string | null;
  trigger: Trigger;
  graph: AutomationGraph;
  enabled: boolean;
  /** Estado mutável (last_fired_at/cooldown, last_metric_value, ...). */
  meta: Record<string, unknown> | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  last_run_at: string | null;
  run_count: number;
};

export type AdminAutomationRun = {
  id: string;
  automation_id: string;
  triggered_by: string;
  trigger_payload: Record<string, unknown> | null;
  status: "running" | "success" | "failed" | "skipped";
  steps: RunStep[];
  started_at: string;
  completed_at: string | null;
};

// =============================================================================
// EVENT PAYLOAD (publicado via publishAdminEvent)
// =============================================================================

export type AdminEventPayload = {
  event: TriggerType;
  payload: Record<string, unknown>;
  timestamp: string;
};
