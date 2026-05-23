/**
 * WhatsApp Business — cliente provider-agnostic e gated.
 *
 * Envia notificações pra cliente final via WhatsApp quando ele recebe doc
 * no portal ou tem cobrança PIX pendente. Quando WHATSAPP_PROVIDER não
 * está setado, `isWhatsappEnabled()` retorna false e `sendWhatsapp()`
 * pula silenciosamente — comportamento idêntico ao Resend (gated).
 *
 * Providers suportados:
 *  - z-api: Z-API (https://z-api.io) — provider BR, REST simples.
 *  - meta-cloud: Meta Cloud API (stub — não implementado em V1).
 */

import { env } from "@/lib/validators/env";
import { captureException } from "@/lib/observability/sentry";

export type WhatsappMessage = {
  /** Número no formato E.164 SEM o "+" (ex: "5511987654321"). */
  to: string;
  text: string;
  /**
   * Tag pra rastreio/observabilidade (não é enviada ao usuário final).
   * Ex: "portal.document_sent", "billing.payment_overdue".
   */
  tag?: string;
};

export type WhatsappResult =
  | { ok: true; provider: string; message_id?: string }
  | { ok: false; error: string; skipped?: boolean };

export function isWhatsappEnabled(): boolean {
  if (env.WHATSAPP_PROVIDER === "z-api") {
    return Boolean(env.ZAPI_INSTANCE_ID && env.ZAPI_TOKEN);
  }
  if (env.WHATSAPP_PROVIDER === "meta-cloud") {
    return Boolean(env.META_WA_ACCESS_TOKEN && env.META_WA_PHONE_NUMBER_ID);
  }
  return false;
}

/**
 * Envia mensagem de texto via WhatsApp. Falhas são logadas mas NÃO lançam —
 * o caller deve sempre continuar (e-mail fallback, persistência etc).
 *
 * Retorna `skipped: true` quando o provider não está configurado — usado
 * pelo caller pra saber se vale tentar fallback (Resend e-mail).
 */
export async function sendWhatsapp(message: WhatsappMessage): Promise<WhatsappResult> {
  if (!isWhatsappEnabled()) {
    return { ok: false, error: "WhatsApp provider não configurado.", skipped: true };
  }

  // Normaliza o número: só dígitos. Validação básica de tamanho.
  const phoneDigits = message.to.replace(/\D+/g, "");
  if (phoneDigits.length < 10 || phoneDigits.length > 15) {
    return { ok: false, error: `Telefone inválido: ${message.to}` };
  }

  try {
    if (env.WHATSAPP_PROVIDER === "z-api") {
      return await sendViaZApi({ ...message, to: phoneDigits });
    }
    if (env.WHATSAPP_PROVIDER === "meta-cloud") {
      return await sendViaMetaCloud({ ...message, to: phoneDigits });
    }
    return { ok: false, error: "Provider desconhecido." };
  } catch (err) {
    await captureException(err, {
      tags: {
        area: "whatsapp",
        provider: env.WHATSAPP_PROVIDER ?? "unknown",
        tag: message.tag ?? "",
      },
    });
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Erro desconhecido ao enviar WhatsApp.",
    };
  }
}

// =============================================================================
// Z-API provider
// =============================================================================

async function sendViaZApi(msg: WhatsappMessage): Promise<WhatsappResult> {
  const instanceId = env.ZAPI_INSTANCE_ID;
  const token = env.ZAPI_TOKEN;
  if (!instanceId || !token) {
    return { ok: false, error: "Z-API: ZAPI_INSTANCE_ID ou ZAPI_TOKEN ausente.", skipped: true };
  }

  const url = `https://api.z-api.io/instances/${instanceId}/token/${token}/send-text`;
  const headers: Record<string, string> = {
    "content-type": "application/json",
  };
  // Client-token é um header extra de segurança disponível pra contas Z-API
  // que ligaram esse modo. Quando setado, todos os requests precisam dele.
  if (env.ZAPI_CLIENT_TOKEN) {
    headers["client-token"] = env.ZAPI_CLIENT_TOKEN;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({
        phone: msg.to,
        message: msg.text,
      }),
      signal: controller.signal,
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return {
        ok: false,
        error: `Z-API HTTP ${res.status}: ${body.slice(0, 200)}`,
      };
    }
    const json = (await res.json().catch(() => null)) as { messageId?: string; id?: string } | null;
    return {
      ok: true,
      provider: "z-api",
      message_id: json?.messageId ?? json?.id,
    };
  } finally {
    clearTimeout(timer);
  }
}

// =============================================================================
// Meta Cloud provider (stub V2)
// =============================================================================

async function sendViaMetaCloud(_msg: WhatsappMessage): Promise<WhatsappResult> {
  // Meta Cloud exige templates aprovados pra mensagens fora de janela de 24h.
  // Setup mais complexo — adiar pra V2. Stub retorna no-op pra não quebrar
  // o fluxo caso alguém configure por engano.
  return {
    ok: false,
    error: "Meta Cloud provider ainda não implementado. Use z-api por enquanto.",
  };
}
