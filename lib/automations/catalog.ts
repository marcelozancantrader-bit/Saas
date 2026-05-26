/**
 * Catálogo central de triggers + actions + conditions.
 *
 * Cada entry tem metadata (label, description, ícone) consumida pelo editor
 * React Flow no /admin/automacoes/[id], e schema zod consumido pelo runner
 * pra validar config antes de executar.
 */

import {
  ACTION_TYPES,
  TRIGGER_TYPES,
  type ActionType,
  type TriggerType,
  sendEmailAdminConfigSchema,
  sendSlackConfigSchema,
  sendTelegramConfigSchema,
  markOrgMetaConfigSchema,
  webhookPostConfigSchema,
  createAuditEntryConfigSchema,
  waitDelayConfigSchema,
  ifConditionConfigSchema,
  forEachConfigSchema,
} from "./types";
import type { ZodTypeAny } from "zod";

// =============================================================================
// TRIGGERS
// =============================================================================

export type TriggerCatalogEntry = {
  id: TriggerType;
  label: string;
  description: string;
  /** Categoria pra agrupar no editor. */
  category: "Eventos do app" | "Pagamento" | "Sistema" | "Tempo" | "Métricas";
  /** Exemplo de shape do payload que vai chegar (pra o admin saber o que tem disponível). */
  examplePayload: Record<string, unknown>;
};

export const TRIGGER_CATALOG: Record<TriggerType, TriggerCatalogEntry> = {
  "signup.created": {
    id: "signup.created",
    label: "Novo signup",
    description: "Quando um workspace novo é criado via /signup.",
    category: "Eventos do app",
    examplePayload: {
      org_id: "uuid",
      org_name: "Studio Silva Arquitetura",
      user_id: "uuid",
      email: "joao@studio.com",
      full_name: "João Silva",
    },
  },
  "subscription.upgraded": {
    id: "subscription.upgraded",
    label: "Plano atualizado",
    description: "Quando uma org assina plano pago (Solo/Pro/Studio/Agency).",
    category: "Pagamento",
    examplePayload: {
      org_id: "uuid",
      org_name: "Studio Silva",
      new_plano: "pro",
      old_plano: "free",
      cycle: "monthly",
    },
  },
  "subscription.canceled": {
    id: "subscription.canceled",
    label: "Plano cancelado",
    description: "Quando uma org cancela assinatura paga.",
    category: "Pagamento",
    examplePayload: {
      org_id: "uuid",
      org_name: "Studio Silva",
      previous_plano: "pro",
      reason: "user_initiated",
    },
  },
  "document.generated": {
    id: "document.generated",
    label: "Documento gerado",
    description: "Quando IA gera um documento (memorial, contrato, etc).",
    category: "Eventos do app",
    examplePayload: {
      org_id: "uuid",
      project_id: "uuid",
      document_id: "uuid",
      tipo: "memorial",
      versao: 1,
      usd_cost: 0.12,
    },
  },
  "payment.received": {
    id: "payment.received",
    label: "Pagamento confirmado",
    description: "Asaas confirmou pagamento (PIX/boleto/cartão).",
    category: "Pagamento",
    examplePayload: {
      org_id: "uuid",
      subscription_id: "uuid",
      plano: "pro",
      amount_cents: 21990,
    },
  },
  "payment.overdue": {
    id: "payment.overdue",
    label: "Pagamento atrasado",
    description: "Asaas marcou pagamento como atrasado.",
    category: "Pagamento",
    examplePayload: {
      org_id: "uuid",
      subscription_id: "uuid",
      plano: "pro",
    },
  },
  "payment.refunded": {
    id: "payment.refunded",
    label: "Pagamento estornado",
    description: "Cliente recebeu refund; org voltou pra Free.",
    category: "Pagamento",
    examplePayload: {
      org_id: "uuid",
      subscription_id: "uuid",
      previous_plano: "pro",
    },
  },
  "error.captured": {
    id: "error.captured",
    label: "Erro capturado (Sentry)",
    description:
      "Qualquer captureException server-side do app dispara este evento. Útil pra alertas em tempo real (Slack/Telegram).",
    category: "Sistema",
    examplePayload: {
      area: "ai.generate-document",
      message: "Anthropic API retornou 529",
      error_name: "AnthropicError",
      org_id: "uuid (se disponível)",
      tags: { area: "ai.generate-document", model: "claude-sonnet-4" },
    },
  },
  "schedule.daily": {
    id: "schedule.daily",
    label: "Todo dia 9h BRT",
    description: "Disparado uma vez por dia pelo cron interno.",
    category: "Tempo",
    examplePayload: {
      date: "2026-05-25",
      timestamp: "2026-05-25T12:00:00Z",
    },
  },
  "metric.threshold": {
    id: "metric.threshold",
    label: "Métrica passa um threshold",
    description:
      "Cron a cada 15 min avalia a métrica configurada e dispara quando o valor cruza o limite (com cooldown anti-spam).",
    category: "Métricas",
    examplePayload: {
      metric: "ai.cost_usd_24h",
      metric_label: "Custo IA (US$) nas últimas 24h",
      unit: "USD",
      op: "gt",
      threshold: 5,
      value: 7.23,
      checked_at: "2026-05-26T15:00:00Z",
    },
  },
};

export const TRIGGERS_BY_CATEGORY = TRIGGER_TYPES.reduce(
  (acc, id) => {
    const entry = TRIGGER_CATALOG[id];
    if (!acc[entry.category]) acc[entry.category] = [];
    acc[entry.category]!.push(entry);
    return acc;
  },
  {} as Record<string, TriggerCatalogEntry[]>,
);

// =============================================================================
// ACTIONS
// =============================================================================

export type ActionCatalogEntry = {
  id: ActionType;
  label: string;
  description: string;
  category: "Notificar" | "Modificar" | "Controle";
  configSchema: ZodTypeAny;
  /** Renderiza placeholders típicos do form do editor. */
  configPlaceholder: Record<string, string>;
};

export const ACTION_CATALOG: Record<ActionType, ActionCatalogEntry> = {
  send_email_admin: {
    id: "send_email_admin",
    label: "Email pra admin",
    description: "Envia email pro SUPPORT_EMAIL via Resend.",
    category: "Notificar",
    configSchema: sendEmailAdminConfigSchema,
    configPlaceholder: {
      subject: "Novo signup: {{payload.org_name}}",
      body: "Email do user: {{payload.email}}",
    },
  },
  send_slack: {
    id: "send_slack",
    label: "Mensagem no Slack",
    description: "POST pra webhook Slack (precisa ADMIN_SLACK_WEBHOOK_URL).",
    category: "Notificar",
    configSchema: sendSlackConfigSchema,
    configPlaceholder: {
      text: ":bell: Nova org pagante: {{payload.org_name}}",
    },
  },
  send_telegram: {
    id: "send_telegram",
    label: "Mensagem no Telegram",
    description: "Telegram Bot API (precisa ADMIN_TELEGRAM_BOT_TOKEN + CHAT_ID).",
    category: "Notificar",
    configSchema: sendTelegramConfigSchema,
    configPlaceholder: {
      text: "🔔 Pagamento recebido: R$ {{payload.amount_cents}} de {{payload.org_name}}",
    },
  },
  mark_org_meta: {
    id: "mark_org_meta",
    label: "Marcar flag na org",
    description: "Atualiza organizations.meta com chave/valor.",
    category: "Modificar",
    configSchema: markOrgMetaConfigSchema,
    configPlaceholder: {
      org_id_path: "org_id",
      key: "vip_customer",
      value: "true",
    },
  },
  webhook_post: {
    id: "webhook_post",
    label: "Webhook genérico",
    description: "POST pra URL externa com body customizável.",
    category: "Notificar",
    configSchema: webhookPostConfigSchema,
    configPlaceholder: {
      url: "https://hooks.zapier.com/...",
      body_template: '{"event":"{{$.event}}","payload":{{$.payload}}}',
    },
  },
  create_audit_entry: {
    id: "create_audit_entry",
    label: "Registrar em audit_log",
    description: "Insere entrada em audit_log pra rastreio.",
    category: "Modificar",
    configSchema: createAuditEntryConfigSchema,
    configPlaceholder: {
      action: "automation.triggered",
      entity_type: "automation",
      entity_id_path: "automation_id",
    },
  },
  wait_delay: {
    id: "wait_delay",
    label: "Esperar X segundos",
    description: "Pausa execução. Útil entre actions.",
    category: "Controle",
    configSchema: waitDelayConfigSchema,
    configPlaceholder: {
      seconds: "60",
    },
  },
  if_condition: {
    id: "if_condition",
    label: "Se / Senão",
    description: "Avalia condição no payload. 2 branches: true / false.",
    category: "Controle",
    configSchema: ifConditionConfigSchema,
    configPlaceholder: {
      path: "payload.new_plano",
      op: "eq",
      value: "studio",
    },
  },
  for_each: {
    id: "for_each",
    label: "Pra cada item (loop)",
    description:
      "Itera sobre um array do payload. Executa o subgrafo conectado em 'loop' uma vez por item (cap 500). Depois segue por 'done'. Use {{item}} e {{index}} nos templates.",
    category: "Controle",
    configSchema: forEachConfigSchema,
    configPlaceholder: {
      items_path: "payload.items",
      max_iterations: "50",
    },
  },
};

export const ACTIONS_BY_CATEGORY = ACTION_TYPES.reduce(
  (acc, id) => {
    const entry = ACTION_CATALOG[id];
    if (!acc[entry.category]) acc[entry.category] = [];
    acc[entry.category]!.push(entry);
    return acc;
  },
  {} as Record<string, ActionCatalogEntry[]>,
);

// =============================================================================
// HELPERS
// =============================================================================

export function isConditionAction(actionType: string): boolean {
  return actionType === "if_condition";
}

export function isLoopAction(actionType: string): boolean {
  return actionType === "for_each";
}

export function isControlAction(actionType: string): boolean {
  return actionType === "if_condition" || actionType === "wait_delay" || actionType === "for_each";
}
