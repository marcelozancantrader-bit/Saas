import "server-only";
import { env } from "@/lib/validators/env";
import { sendTelegramConfigSchema } from "../types";
import { resolveTemplate, type ActionContext, type ActionResult } from "./index";

/**
 * Telegram Bot API. Setup:
 * 1. Falar com @BotFather no Telegram, /newbot, copiar token.
 * 2. Adicionar bot ao chat/grupo desejado.
 * 3. Pegar chat_id via https://api.telegram.org/bot<TOKEN>/getUpdates
 * 4. Set ADMIN_TELEGRAM_BOT_TOKEN + ADMIN_TELEGRAM_CHAT_ID.
 */
export async function runSendTelegram(
  config: Record<string, unknown>,
  ctx: ActionContext,
): Promise<ActionResult> {
  const parsed = sendTelegramConfigSchema.safeParse(config);
  if (!parsed.success) {
    return { ok: false, error: `Config inválida: ${parsed.error.issues[0]?.message ?? "?"}` };
  }

  if (!env.ADMIN_TELEGRAM_BOT_TOKEN || !env.ADMIN_TELEGRAM_CHAT_ID) {
    return {
      ok: false,
      error: "ADMIN_TELEGRAM_BOT_TOKEN ou ADMIN_TELEGRAM_CHAT_ID não configurados",
    };
  }

  const text = resolveTemplate(parsed.data.text, ctx.payload);

  try {
    const r = await fetch(
      `https://api.telegram.org/bot${env.ADMIN_TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: env.ADMIN_TELEGRAM_CHAT_ID,
          text,
          parse_mode: "HTML",
        }),
      },
    );
    if (!r.ok) {
      const detail = await r.text().catch(() => "");
      return { ok: false, error: `Telegram retornou ${r.status}: ${detail.slice(0, 200)}` };
    }
    return { ok: true, output: { sent: true } };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
