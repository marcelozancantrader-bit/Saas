/**
 * Sprint 8 — PostHog client leve.
 *
 * Cliente-side (browser): inicializa só se NEXT_PUBLIC_POSTHOG_KEY está setado.
 * Usa o snippet HTTP direto em vez do posthog-js (~30KB) — capturamos apenas
 * eventos críticos do funnel de ativação. No browser injetamos via efeito.
 *
 * Para ativar PostHog full: instale posthog-js + posthog-node e expanda.
 */

type CaptureProps = Record<string, string | number | boolean | null>;

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
