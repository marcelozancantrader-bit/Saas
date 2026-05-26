import "server-only";
import { env } from "@/lib/validators/env";
import { sendSlackConfigSchema } from "../types";
import { resolveTemplate, type ActionContext, type ActionResult } from "./index";

/**
 * POST pra Slack incoming webhook.
 * Configurar webhook em Slack: Workspace → Apps → Incoming Webhooks → criar
 * pra channel desejado → copiar URL → set em ADMIN_SLACK_WEBHOOK_URL.
 */
export async function runSendSlack(
  config: Record<string, unknown>,
  ctx: ActionContext,
): Promise<ActionResult> {
  const parsed = sendSlackConfigSchema.safeParse(config);
  if (!parsed.success) {
    return { ok: false, error: `Config inválida: ${parsed.error.issues[0]?.message ?? "?"}` };
  }

  if (!env.ADMIN_SLACK_WEBHOOK_URL) {
    return { ok: false, error: "ADMIN_SLACK_WEBHOOK_URL não configurada" };
  }

  const text = resolveTemplate(parsed.data.text, ctx.payload);

  try {
    const r = await fetch(env.ADMIN_SLACK_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    if (!r.ok) {
      const detail = await r.text().catch(() => "");
      return { ok: false, error: `Slack retornou ${r.status}: ${detail.slice(0, 200)}` };
    }
    return { ok: true, output: { sent: true } };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
