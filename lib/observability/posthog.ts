/**
 * PostHog client leve — sem dependência (~50KB economizados).
 *
 * Browser: `capture()` usa sendBeacon, persistente entre page transitions.
 *   localStorage("ph_did") guarda o distinct_id; vira user.id após `identify`.
 *
 * Server: `captureServer({ distinctId, event, properties })` faz HTTP POST
 *   direto. Use em server actions quando o evento é mais confiável de capturar
 *   no backend (signup, doc gerado, doc aprovado pelo cliente via portal).
 *
 * Sem NEXT_PUBLIC_POSTHOG_KEY: tudo é no-op silencioso.
 */

type CaptureProps = Record<string, string | number | boolean | null | undefined>;

const POSTHOG_HOST_DEFAULT = "https://us.i.posthog.com";

export function isPosthogEnabled(): boolean {
  return typeof window !== "undefined" && !!process.env.NEXT_PUBLIC_POSTHOG_KEY;
}

export function capture(eventName: string, properties?: CaptureProps): void {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key) return;
  if (typeof window === "undefined") return; // só client por ora

  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? POSTHOG_HOST_DEFAULT;
  const distinctId =
    window.localStorage.getItem("ph_did") ??
    (() => {
      const id = crypto.randomUUID();
      window.localStorage.setItem("ph_did", id);
      return id;
    })();

  const body = {
    api_key: key,
    event: eventName,
    distinct_id: distinctId,
    properties: {
      ...properties,
      $current_url: window.location.href,
      $lib: "memorial-ai-lite",
    },
    timestamp: new Date().toISOString(),
  };

  // sendBeacon survives page transitions; fall back to fetch
  const url = `${host}/i/v0/e/`;
  if ("sendBeacon" in navigator) {
    navigator.sendBeacon(url, JSON.stringify(body));
  } else {
    void fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      keepalive: true,
    }).catch(() => {});
  }
}

export function identify(userId: string, properties?: CaptureProps): void {
  if (typeof window !== "undefined") {
    window.localStorage.setItem("ph_did", userId);
  }
  capture("$identify", properties);
}

/**
 * Captura evento server-side. Use em server actions quando o evento é mais
 * confiável de capturar no backend (ex: signup, generate document, portal
 * approval). Não bloqueia — fire-and-forget. Sem NEXT_PUBLIC_POSTHOG_KEY,
 * é no-op silencioso.
 */
export async function captureServer(input: {
  event: string;
  distinctId: string;
  properties?: CaptureProps;
  /** ID da org pra group analytics. Default: usado como property `org_id`. */
  orgId?: string;
}): Promise<void> {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key) return;
  if (!input.distinctId) return;

  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? POSTHOG_HOST_DEFAULT;
  const body = {
    api_key: key,
    event: input.event,
    distinct_id: input.distinctId,
    properties: {
      ...input.properties,
      org_id: input.orgId ?? input.properties?.org_id,
      $lib: "memorial-ai-server",
    },
    timestamp: new Date().toISOString(),
  };

  try {
    await fetch(`${host}/i/v0/e/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      // Timeout curto pra nao atrasar a resposta da action
      signal: AbortSignal.timeout(2000),
    });
  } catch {
    // ignore — analytics é best-effort
  }
}
