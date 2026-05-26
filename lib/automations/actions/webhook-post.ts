import "server-only";
import { webhookPostConfigSchema } from "../types";
import { resolveTemplate, type ActionContext, type ActionResult } from "./index";

/**
 * POST genérico pra URL externa (Zapier, Make, próprio backend, etc).
 * Timeout 10s pra evitar travar a engine.
 */
export async function runWebhookPost(
  config: Record<string, unknown>,
  ctx: ActionContext,
): Promise<ActionResult> {
  const parsed = webhookPostConfigSchema.safeParse(config);
  if (!parsed.success) {
    return { ok: false, error: `Config inválida: ${parsed.error.issues[0]?.message ?? "?"}` };
  }

  const body = resolveTemplate(parsed.data.body_template, ctx.payload);

  // Tenta parsear como JSON, senão envia como text/plain
  let bodyToSend: string = body;
  let contentType = "application/json";
  try {
    JSON.parse(body);
  } catch {
    contentType = "text/plain";
    bodyToSend = body;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);
  try {
    const r = await fetch(parsed.data.url, {
      method: "POST",
      headers: { "Content-Type": contentType },
      body: bodyToSend,
      signal: controller.signal,
    });
    if (!r.ok) {
      const detail = await r.text().catch(() => "");
      return { ok: false, error: `Webhook retornou ${r.status}: ${detail.slice(0, 200)}` };
    }
    return { ok: true, output: { status: r.status } };
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      return { ok: false, error: "Timeout 10s ao chamar webhook" };
    }
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  } finally {
    clearTimeout(timer);
  }
}
