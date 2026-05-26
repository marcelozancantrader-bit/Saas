/**
 * Receitas pré-prontas de automações — atalhos pro admin não começar do zero.
 *
 * Cada recipe descreve uma automação completa (trigger + actions + edges)
 * que o usuário pode importar com 1 clique. Pode editar depois.
 *
 * Adicionar uma receita aqui é o jeito mais rápido de educar o admin sobre
 * o que é possível fazer com o builder.
 */

import type { AutomationGraph, Trigger, TriggerType } from "./types";

export type Recipe = {
  id: string;
  /** Nome curto exibido no card. */
  name: string;
  /** Descrição de 1-2 frases mostrando o valor. */
  description: string;
  /** Categoria pra agrupar no UI. */
  category: "Conversão" | "Operação" | "Receita" | "Suporte" | "Métricas" | "Confiabilidade";
  /** Emoji ou Lucide icon name (renderizado como prefix). */
  icon: string;
  trigger: Trigger;
  /** Graph completo (nodes + edges) — quando importar, IDs viram únicos. */
  graph: AutomationGraph;
};

/**
 * Helper pra gerar IDs únicos no momento da importação.
 * Receitas usam IDs placeholder que são reescritos pelo importer.
 */
function n(id: string) {
  return id;
}

export const RECIPES: Recipe[] = [
  {
    id: "signup-email-admin",
    name: "Email a cada signup",
    description:
      "Recebe email no SUPPORT_EMAIL toda vez que alguém cria um workspace novo. Útil pra acompanhar crescimento em tempo real.",
    category: "Conversão",
    icon: "📩",
    trigger: { type: "signup.created", config: {} },
    graph: {
      nodes: [
        {
          id: n("trigger-1"),
          type: "trigger",
          position: { x: 80, y: 80 },
          data: {
            kind: "trigger",
            actionType: "signup.created",
            label: "Novo signup",
            config: {},
          },
        },
        {
          id: n("email-1"),
          type: "action",
          position: { x: 360, y: 80 },
          data: {
            kind: "action",
            actionType: "send_email_admin",
            label: "Email pra admin",
            config: {
              subject: "🎉 Novo signup: {{payload.org_name}}",
              body: "Workspace novo:\n\nNome: {{payload.org_name}}\nEmail: {{payload.email}}\nFull name: {{payload.full_name}}\n\nAcessa /admin/organizations pra detalhes.",
            },
          },
        },
      ],
      edges: [{ id: "e-1", source: n("trigger-1"), target: n("email-1") }],
    },
  },
  {
    id: "payment-received-slack",
    name: "Pagamento confirmado → Slack",
    description:
      "Notifica no Slack toda vez que pagamento Asaas é confirmado. Bom pra celebrar wins em tempo real com o time.",
    category: "Receita",
    icon: "💰",
    trigger: { type: "payment.received", config: {} },
    graph: {
      nodes: [
        {
          id: n("trigger-1"),
          type: "trigger",
          position: { x: 80, y: 80 },
          data: {
            kind: "trigger",
            actionType: "payment.received",
            label: "Pagamento confirmado",
            config: {},
          },
        },
        {
          id: n("slack-1"),
          type: "action",
          position: { x: 360, y: 80 },
          data: {
            kind: "action",
            actionType: "send_slack",
            label: "Mensagem no Slack",
            config: {
              text: ":money_with_wings: Pagamento confirmado! Plano {{payload.plano}} — org {{payload.org_id}}",
            },
          },
        },
      ],
      edges: [{ id: "e-1", source: n("trigger-1"), target: n("slack-1") }],
    },
  },
  {
    id: "payment-overdue-alert",
    name: "Pagamento atrasado → alerta",
    description:
      "Avisa por email quando um cliente fica em atraso. Permite intervir antes do downgrade automático.",
    category: "Suporte",
    icon: "⚠️",
    trigger: { type: "payment.overdue", config: {} },
    graph: {
      nodes: [
        {
          id: n("trigger-1"),
          type: "trigger",
          position: { x: 80, y: 80 },
          data: {
            kind: "trigger",
            actionType: "payment.overdue",
            label: "Pagamento atrasado",
            config: {},
          },
        },
        {
          id: n("email-1"),
          type: "action",
          position: { x: 360, y: 80 },
          data: {
            kind: "action",
            actionType: "send_email_admin",
            label: "Email pra admin",
            config: {
              subject: "⚠️ Pagamento atrasado: org {{payload.org_id}}",
              body: "Org {{payload.org_id}} (plano {{payload.plano}}) ficou em past_due no Asaas.\n\nVerifique em /admin/organizations e considere contato direto antes do downgrade automático.",
            },
          },
        },
      ],
      edges: [{ id: "e-1", source: n("trigger-1"), target: n("email-1") }],
    },
  },
  {
    id: "high-value-upgrade-celebration",
    name: "Studio assinado → Slack + email",
    description:
      "Quando alguém assina o plano Studio (ticket mais alto), notifica Slack E email — pra você não perder ninguém que merece atendimento VIP.",
    category: "Receita",
    icon: "🚀",
    trigger: { type: "subscription.upgraded", config: {} },
    graph: {
      nodes: [
        {
          id: n("trigger-1"),
          type: "trigger",
          position: { x: 80, y: 80 },
          data: {
            kind: "trigger",
            actionType: "subscription.upgraded",
            label: "Upgrade",
            config: {},
          },
        },
        {
          id: n("if-1"),
          type: "condition",
          position: { x: 340, y: 80 },
          data: {
            kind: "condition",
            actionType: "if_condition",
            label: "Se Studio",
            config: { path: "new_plano", op: "eq", value: "studio" },
          },
        },
        {
          id: n("slack-1"),
          type: "action",
          position: { x: 640, y: 30 },
          data: {
            kind: "action",
            actionType: "send_slack",
            label: "Slack VIP",
            config: {
              text: ":rocket: STUDIO assinado por {{payload.org_name}}! Atendimento VIP recomendado.",
            },
          },
        },
        {
          id: n("email-1"),
          type: "action",
          position: { x: 640, y: 150 },
          data: {
            kind: "action",
            actionType: "send_email_admin",
            label: "Email detalhes",
            config: {
              subject: "🚀 Studio assinado: {{payload.org_name}}",
              body: "Cliente {{payload.org_name}} migrou de {{payload.old_plano}} pra Studio.\n\nCycle: {{payload.cycle}}\n\nConsidere LinkedIn outreach + email pessoal de boas-vindas em até 24h.",
            },
          },
        },
      ],
      edges: [
        { id: "e-1", source: n("trigger-1"), target: n("if-1") },
        { id: "e-2", source: n("if-1"), target: n("slack-1"), sourceHandle: "true" },
        { id: "e-3", source: n("if-1"), target: n("email-1"), sourceHandle: "true" },
      ],
    },
  },
  {
    id: "ai-cost-alert",
    name: "Custo IA > US$ 5 em 24h",
    description:
      "Cron a cada 15 min agrega custo de IA das últimas 24h. Se passar US$ 5, alerta no Slack (com cooldown 6h pra não spammar).",
    category: "Métricas",
    icon: "💸",
    trigger: {
      type: "metric.threshold",
      config: {
        metric: "ai.cost_usd_24h",
        op: "gt",
        threshold: 5,
        cooldown_minutes: 360,
      },
    },
    graph: {
      nodes: [
        {
          id: n("trigger-1"),
          type: "trigger",
          position: { x: 80, y: 80 },
          data: {
            kind: "trigger",
            actionType: "metric.threshold",
            label: "Custo IA 24h > US$ 5",
            config: {
              metric: "ai.cost_usd_24h",
              op: "gt",
              threshold: 5,
              cooldown_minutes: 360,
            },
          },
        },
        {
          id: n("slack-1"),
          type: "action",
          position: { x: 360, y: 80 },
          data: {
            kind: "action",
            actionType: "send_slack",
            label: "Slack alerta",
            config: {
              text: ":fire: Custo IA passou US$ {{payload.threshold}}: agora em US$ {{payload.value}} nas últimas 24h.",
            },
          },
        },
      ],
      edges: [{ id: "e-1", source: n("trigger-1"), target: n("slack-1") }],
    },
  },
  {
    id: "error-spike-alert",
    name: "Erro server-side → alerta",
    description:
      "Qualquer captureException no server publica `error.captured`. Esta receita captura e manda email com area + mensagem pra triagem rápida.",
    category: "Confiabilidade",
    icon: "🚨",
    trigger: { type: "error.captured", config: {} },
    graph: {
      nodes: [
        {
          id: n("trigger-1"),
          type: "trigger",
          position: { x: 80, y: 80 },
          data: {
            kind: "trigger",
            actionType: "error.captured",
            label: "Erro capturado",
            config: {},
          },
        },
        {
          id: n("email-1"),
          type: "action",
          position: { x: 360, y: 80 },
          data: {
            kind: "action",
            actionType: "send_email_admin",
            label: "Email pra admin",
            config: {
              subject: "🚨 Erro: {{payload.area}}",
              body: "Area: {{payload.area}}\nErro: {{payload.error_name}}\nMensagem: {{payload.message}}\nOrg: {{payload.org_id}}\n\nConfira o Sentry pra stack completa.",
            },
          },
        },
      ],
      edges: [{ id: "e-1", source: n("trigger-1"), target: n("email-1") }],
    },
  },
  {
    id: "daily-summary-audit",
    name: "Audit diário 9h",
    description:
      "Todo dia 9h BRT, registra entrada em audit_log marcando 'dia processado'. Útil pra ter heartbeat visível no /admin/audit.",
    category: "Operação",
    icon: "📅",
    trigger: { type: "schedule.daily", config: {} },
    graph: {
      nodes: [
        {
          id: n("trigger-1"),
          type: "trigger",
          position: { x: 80, y: 80 },
          data: {
            kind: "trigger",
            actionType: "schedule.daily",
            label: "Todo dia 9h",
            config: {},
          },
        },
        {
          id: n("audit-1"),
          type: "action",
          position: { x: 360, y: 80 },
          data: {
            kind: "action",
            actionType: "create_audit_entry",
            label: "Audit entry",
            config: {
              action: "system.daily_heartbeat",
              entity_type: "system",
            },
          },
        },
      ],
      edges: [{ id: "e-1", source: n("trigger-1"), target: n("audit-1") }],
    },
  },
];

export const RECIPES_BY_CATEGORY = RECIPES.reduce(
  (acc, r) => {
    if (!acc[r.category]) acc[r.category] = [];
    acc[r.category]!.push(r);
    return acc;
  },
  {} as Record<string, Recipe[]>,
);

/**
 * Reescreve IDs do graph com sufixo único — chamado no momento de criar
 * a automation a partir de uma recipe. Mantém estrutura mas evita colisão
 * se múltiplas instâncias da mesma recipe forem importadas.
 */
export function instantiateRecipeGraph(graph: AutomationGraph, suffix: string): AutomationGraph {
  const idMap = new Map<string, string>();
  for (const n of graph.nodes) {
    idMap.set(n.id, `${n.id}-${suffix}`);
  }
  return {
    nodes: graph.nodes.map((n) => ({ ...n, id: idMap.get(n.id) ?? n.id })),
    edges: graph.edges.map((e) => ({
      ...e,
      id: `${e.id}-${suffix}`,
      source: idMap.get(e.source) ?? e.source,
      target: idMap.get(e.target) ?? e.target,
    })),
  };
}

export function findRecipeById(id: string): Recipe | null {
  return RECIPES.find((r) => r.id === id) ?? null;
}

export function findRecipeByTrigger(triggerType: TriggerType): Recipe[] {
  return RECIPES.filter((r) => r.trigger.type === triggerType);
}
