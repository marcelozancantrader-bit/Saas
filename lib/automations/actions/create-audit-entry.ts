import "server-only";
import { createAuditEntryConfigSchema } from "../types";
import { resolveTemplate, type ActionContext, type ActionResult } from "./index";

/**
 * Insere uma linha em audit_log. Útil pra criar trilha custom de eventos
 * (ex: "automation X disparou pra org Y") que aparece no /admin/audit.
 */
export async function runCreateAuditEntry(
  config: Record<string, unknown>,
  ctx: ActionContext,
): Promise<ActionResult> {
  const parsed = createAuditEntryConfigSchema.safeParse(config);
  if (!parsed.success) {
    return { ok: false, error: `Config inválida: ${parsed.error.issues[0]?.message ?? "?"}` };
  }

  const entityId = parsed.data.entity_id_path
    ? resolveTemplate(`{{payload.${parsed.data.entity_id_path}}}`, ctx.payload)
    : null;
  const orgId = resolveTemplate(`{{payload.org_id}}`, ctx.payload);
  const orgIdValid = /^[0-9a-f-]{36}$/i.test(orgId) ? orgId : null;

  const { error } = await ctx.admin.from("audit_log").insert({
    org_id: orgIdValid,
    actor_type: "system",
    action: parsed.data.action,
    entity_type: parsed.data.entity_type,
    entity_id: entityId && /^[0-9a-f-]{36}$/i.test(entityId) ? entityId : null,
    payload: ctx.payload,
  });

  if (error) return { ok: false, error: `audit_log insert falhou: ${error.message}` };
  return { ok: true, output: { action: parsed.data.action } };
}
