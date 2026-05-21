"use client";

import { useEffect, useRef } from "react";

type TurnstileWindow = Window & {
  turnstile?: {
    render: (
      container: HTMLElement,
      options: {
        sitekey: string;
        callback?: (token: string) => void;
        "error-callback"?: () => void;
        "expired-callback"?: () => void;
        theme?: "light" | "dark" | "auto";
        size?: "normal" | "compact";
        appearance?: "always" | "execute" | "interaction-only";
      },
    ) => string;
    reset: (widgetId?: string) => void;
    remove: (widgetId: string) => void;
  };
};

const SCRIPT_URL = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
let scriptPromise: Promise<void> | null = null;

function loadScript(): Promise<void> {
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${SCRIPT_URL}"]`)) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = SCRIPT_URL;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Turnstile script"));
    document.head.appendChild(script);
  });
  return scriptPromise;
}

type Props = {
  siteKey: string;
  fieldName?: string;
};

/**
 * Cloudflare Turnstile widget — captcha invisível/leve.
 *
 * Renderiza um widget que produz um token; o token vira input hidden com o
 * `fieldName` (default `cf_turnstile_token`) pra ir junto no FormData.
 */
export function TurnstileWidget({ siteKey, fieldName = "cf_turnstile_token" }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const hiddenInputRef = useRef<HTMLInputElement>(null);
  const widgetIdRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadScript()
      .then(() => {
        if (cancelled) return;
        const w = window as TurnstileWindow;
        if (!w.turnstile || !containerRef.current) return;
        widgetIdRef.current = w.turnstile.render(containerRef.current, {
          sitekey: siteKey,
          callback: (token: string) => {
            if (hiddenInputRef.current) hiddenInputRef.current.value = token;
          },
          "expired-callback": () => {
            if (hiddenInputRef.current) hiddenInputRef.current.value = "";
          },
          "error-callback": () => {
            if (hiddenInputRef.current) hiddenInputRef.current.value = "";
          },
          theme: "auto",
          appearance: "interaction-only",
        });
      })
      .catch(() => {
        // Silenciosamente — se script falhar, server-side ainda valida.
      });

    return () => {
      cancelled = true;
      const w = window as TurnstileWindow;
      if (w.turnstile && widgetIdRef.current) {
        try {
          w.turnstile.remove(widgetIdRef.current);
        } catch {
          // ignore
        }
      }
    };
  }, [siteKey]);

  return (
    <div>
      <div ref={containerRef} className="flex justify-center" />
      <input ref={hiddenInputRef} type="hidden" name={fieldName} defaultValue="" />
    </div>
  );
}
