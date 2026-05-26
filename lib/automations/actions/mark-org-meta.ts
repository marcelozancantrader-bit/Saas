import "server-only";
import { markOrgMetaConfigSchema } from "../types";
import { resolveTemplate, type ActionContext, type ActionResult } from "./index";

/**
 * UPDATE organizations SET meta = meta || jsonb {key: value} WHERE id = ...
 *
 * org_id_path: aceita "org_id", "org.id", "subscription.org_id" etc.
 * value: pode ser string template ({{payload.x}}) ou literal.
 */
export async function runMarkOrgMeta(
  config: Record<string, unknown>,
  ctx: ActionContext,
): Promise<ActionResult> {
  const parsed = markOrgMetaConfigSchema.safeParse(config);
  if (!parsed.success) {
    return { ok: false, error: `Config inválida: ${parsed.error.issues[0]?.message ?? "?"}` };
  }

  const orgId = resolveTemplate(`{{payload.${parsed.data.org_id_path}}}`, ctx);
  if (!orgId || !/^[0-9a-f-]{36}$/i.test(orgId)) {
    return {
      ok: false,
      error: `org_id_path "${parsed.data.org_id_path}" não resolve pra UUID válido`,
    };
  }
  const valueResolved = resolveTemplate(parsed.data.value, ctx);

  // Parse JSON se valor parece serializado; senão deixa string.
  let valueParsed: unknown = valueResolved;
  if (valueResolved === "true") valueParsed = true;
  else if (valueResolved === "false") valueParsed = false;
  else if (/^-?\d+(\.\d+)?$/.test(valueResolved)) valueParsed = Number(valueResolved);

  // Fetch + merge + update (sem RPC pra simplicidade).
  const { data: orgRow, error: fetchErr } = await ctx.admin
    .from("organizations")
    .select("meta")
    .eq("id", orgId)
    .maybeSingle();
  if (fetchErr) return { ok: false, error: `Fetch org falhou: ${fetchErr.message}` };
  if (!orgRow) return { ok: false, error: `Org ${orgId} não encontrada` };

  const currentMeta = ((orgRow.meta as Record<string, unknown> | null) ?? {}) as Record<
    string,
    unknown
  >;
  const newMeta = { ...currentMeta, [parsed.data.key]: valueParsed };

  const { error: updErr } = await ctx.admin
    .from("organizations")
    .update({ meta: newMeta, updated_at: new Date().toISOString() })
    .eq("id", orgId);
  if (updErr) return { ok: false, error: `Update org falhou: ${updErr.message}` };

  return { ok: true, output: { org_id: orgId, key: parsed.data.key, value: valueParsed } };
}
