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
 * Resolve placeholders {{payload.xxx}} ou {{$.event}} em strings.
 *
 * Suporta:
 *   - {{payload.org.name}}  → payload.org.name
 *   - {{$.event}}            → event name (precisa ser passado em payload._event)
 *   - {{$.timestamp}}        → payload._timestamp
 *
 * Se path não resolve, deixa o {{...}} literal (visível pro admin notar bug).
 */
export function resolveTemplate(template: string, payload: Record<string, unknown>): string {
  return template.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
    const trimmed = String(path).trim();
    const value = resolvePath(payload, trimmed);
    if (value === undefined || value === null) return match;
    if (typeof value === "object") return JSON.stringify(value);
    return String(value);
  });
}

function resolvePath(obj: Record<string, unknown>, path: string): unknown {
  // Suporta "payload.x.y" e "$.event" (sinônimos)
  const cleaned = path.startsWith("$.")
    ? path.slice(2)
    : path.startsWith("payload.")
      ? path.slice(8)
      : path;
  const parts = cleaned.split(".");
  let cur: unknown = obj;
  for (const part of parts) {
    if (cur === null || cur === undefined || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[part];
  }
  return cur;
}
