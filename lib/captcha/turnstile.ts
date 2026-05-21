import "server-only";
import { env } from "@/lib/validators/env";

/**
 * Verifica um token Turnstile com a API do Cloudflare.
 *
 * Gating: se TURNSTILE_SECRET_KEY não estiver setada, valida sempre `ok: true`
 * (dev local). Em prod, se o token for ausente/inválido, retorna `ok: false`.
 *
 * Docs: https://developers.cloudflare.com/turnstile/get-started/server-side-validation/
 */
export async function verifyTurnstile(
  token: string | null | undefined,
  remoteip?: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!env.TURNSTILE_SECRET_KEY) return { ok: true };

  if (!token || token.length < 10) {
    return { ok: false, error: "Captcha não preenchido. Confirme que você não é um robô." };
  }

  const params = new URLSearchParams();
  params.set("secret", env.TURNSTILE_SECRET_KEY);
  params.set("response", token);
  if (remoteip) params.set("remoteip", remoteip);

  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });
    if (!res.ok) {
      return { ok: false, error: "Falha na verificação do captcha. Tente novamente." };
    }
    const data = (await res.json()) as { success: boolean; "error-codes"?: string[] };
    if (!data.success) {
      return { ok: false, error: "Captcha inválido. Recarregue a página e tente novamente." };
    }
    return { ok: true };
  } catch {
    return { ok: false, error: "Não foi possível verificar o captcha." };
  }
}

export function isTurnstileEnabled(): boolean {
  return !!env.TURNSTILE_SECRET_KEY;
}
