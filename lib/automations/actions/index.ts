import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { ActionType } from "../types";
import { runSendEmailAdmin } from "./send-email-admin";
import { runSendSlack } from "./send-slack";
import { runSendTelegram } from "./send-telegram";
import { runMarkOrgMeta } from "./mark-org-meta";
import { runWebhookPost } from "./webhook-post";
import { runCreateAuditEntry } from "./create-audit-entry";
import { runWaitDelay } from "./wait-delay";
import { runIfCondition } from "./if-condition";

/**
 * Contexto passado a cada action handler.
 */
export type ActionContext = {
  /** Service-role client pra mutar tabelas. */
  admin: SupabaseClient;
  /** Payload do trigger original (acessado via {{payload.*}} nos templates). */
  payload: Record<string, unknown>;
  /** Step do Inngest pra delays e retry isolado. */
  step?: {
    sleep: (id: string, duration: string) => Promise<void>;
  };
  /** Outputs acumulados de steps anteriores — chave = node_id. */
  steps?: Record<string, unknown>;
  /** Output do step que acabou de rodar — azucar pra `{{lastStep.x}}`. */
  lastStep?: unknown;
};

/**
 * Resultado de uma action.
 */
export type ActionResult =
  | {
      ok: true;
      output?: unknown;
      /** if_condition retorna qual branch seguir */ branch?: "true" | "false";
    }
  | { ok: false; error: string };

export type ActionHandler = (
  config: Record<string, unknown>,
  ctx: ActionContext,
) => Promise<ActionResult>;

const HANDLERS: Record<ActionType, ActionHandler> = {
  send_email_admin: runSendEmailAdmin,
  send_slack: runSendSlack,
  send_telegram: runSendTelegram,
  mark_org_meta: runMarkOrgMeta,
  webhook_post: runWebhookPost,
  create_audit_entry: runCreateAuditEntry,
  wait_delay: runWaitDelay,
  if_condition: runIfCondition,
};

export function getActionHandler(actionType: string): ActionHandler | null {
  return HANDLERS[actionType as ActionType] ?? null;
}

/**
 * Resolve placeholders em strings. Suportados:
 *   - {{payload.org.name}}    → ctx.payload.org.name (trigger original)
 *   - {{$.event}}              → atalho pra payload (sinônimo de {{payload.x}})
 *   - {{steps.node_id.x}}      → output do step `node_id` (após ele rodar)
 *   - {{lastStep.x}}           → output do step que acabou de rodar
 *
 * Se path não resolve, deixa o {{...}} literal (visível pro admin notar bug).
 *
 * Versão simplificada (sem ctx) ainda funciona pra backward compat — só
 * resolve {{payload.x}}.
 */
export function resolveTemplate(
  template: string,
  payloadOrCtx: Record<string, unknown> | ActionContext,
): string {
  // Detecta se é ActionContext ou payload puro
  const isCtx =
    payloadOrCtx &&
    typeof payloadOrCtx === "object" &&
    "payload" in payloadOrCtx &&
    "admin" in payloadOrCtx;
  const ctx = isCtx ? (payloadOrCtx as ActionContext) : null;
  const payload = isCtx ? ctx!.payload : (payloadOrCtx as Record<string, unknown>);

  return template.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
    const trimmed = String(path).trim();
    const value = resolvePath(trimmed, payload, ctx);
    if (value === undefined || value === null) return match;
    if (typeof value === "object") return JSON.stringify(value);
    return String(value);
  });
}

function resolvePath(
  path: string,
  payload: Record<string, unknown>,
  ctx: ActionContext | null,
): unknown {
  // Variáveis encadeadas: steps.<node_id>.<...> e lastStep.<...>
  if (ctx && path.startsWith("lastStep")) {
    const rest = path === "lastStep" ? [] : path.slice("lastStep.".length).split(".");
    return walkObject(ctx.lastStep, rest);
  }
  if (ctx && path.startsWith("steps.")) {
    const rest = path.slice("steps.".length).split(".");
    return walkObject(ctx.steps ?? {}, rest);
  }

  // Atalhos do payload original ($.x ou payload.x ou x direto)
  const cleaned = path.startsWith("$.")
    ? path.slice(2)
    : path.startsWith("payload.")
      ? path.slice(8)
      : path;
  return walkObject(payload, cleaned.split("."));
}

function walkObject(obj: unknown, parts: string[]): unknown {
  if (parts.length === 0) return obj;
  let cur: unknown = obj;
  for (const part of parts) {
    if (cur === null || cur === undefined || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[part];
  }
  return cur;
}
