import "server-only";
import { waitDelayConfigSchema } from "../types";
import { type ActionContext, type ActionResult } from "./index";

/**
 * Pausa execução. Usa step.sleep do Inngest pra liberar worker durante delay.
 * Fallback: setTimeout (pra test-run sem Inngest).
 */
export async function runWaitDelay(
  config: Record<string, unknown>,
  ctx: ActionContext,
): Promise<ActionResult> {
  const parsed = waitDelayConfigSchema.safeParse(config);
  if (!parsed.success) {
    return { ok: false, error: `Config inválida: ${parsed.error.issues[0]?.message ?? "?"}` };
  }

  const seconds = parsed.data.seconds;

  if (ctx.step?.sleep) {
    await ctx.step.sleep(`wait-${seconds}s-${Date.now()}`, `${seconds}s`);
  } else {
    // Fallback pra test-run — limita a 5s pra não travar UI
    const ms = Math.min(seconds, 5) * 1000;
    await new Promise((r) => setTimeout(r, ms));
  }

  return { ok: true, output: { waited_seconds: seconds } };
}
