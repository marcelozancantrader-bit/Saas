import "server-only";
import { env } from "@/lib/validators/env";

/**
 * Sprint 8 — Sentry reporter leve (sem SDK).
 *
 * Faz POST direto na ingest API do Sentry quando SENTRY_DSN está setado.
 * Sem instalar @sentry/nextjs (que pesa ~150KB no bundle). Para V0 / beta,
 * isso captura erros server-side; client-side errors ficam pelo PostHog +
 * console do browser.
 *
 * Para ativar Sentry full: instale @sentry/nextjs e remova este wrapper.
 */

type SentryEvent = {
  message?: string;
  level?: "fatal" | "error" | "warning" | "info";
  exception?: {
    values: Array<{
      type: string;
      value: string;
      stacktrace?: { frames: Array<{ filename?: string; lineno?: number; function?: string }> };
    }>;
  };
  tags?: Record<string, string>;
  extra?: Record<string, unknown>;
  environment?: string;
  release?: string;
  timestamp?: number;
};

function parseDsn(
  dsn: string,
): { protocol: string; key: string; host: string; projectId: string } | null {
  // Format: https://<key>@<host>/<projectId>
  const m = /^(https?):\/\/([^@]+)@([^/]+)\/(\d+)/.exec(dsn);
  if (!m) return null;
  return { protocol: m[1]!, key: m[2]!, host: m[3]!, projectId: m[4]! };
}

export async function captureException(
  err: unknown,
  context?: { tags?: Record<string, string>; extra?: Record<string, unknown> },
): Promise<void> {
  if (!env.SENTRY_DSN) {
    console.error("[sentry stub]", err, context);
    return;
  }
  const dsn = parseDsn(env.SENTRY_DSN);
  if (!dsn) return;

  const error = err instanceof Error ? err : new Error(String(err));
  const event: SentryEvent = {
    level: "error",
    timestamp: Date.now() / 1000,
    environment: process.env.NODE_ENV ?? "production",
    exception: {
      values: [
        {
          type: error.name,
          value: error.message,
          stacktrace: error.stack
            ? {
                frames: error.stack
                  .split("\n")
                  .slice(1, 11)
                  .map((line) => {
                    const m = /at (.+?) \(?([^:)]+):(\d+)/.exec(line);
                    return {
                      function: m?.[1],
                      filename: m?.[2],
                      lineno: m?.[3] ? parseInt(m[3], 10) : undefined,
                    };
                  }),
              }
            : undefined,
        },
      ],
    },
    tags: context?.tags,
    extra: context?.extra,
  };

  const url = `${dsn.protocol}://${dsn.host}/api/${dsn.projectId}/store/`;
  const auth = `Sentry sentry_version=7,sentry_key=${dsn.key},sentry_client=memorial-ai/1.0`;
  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Sentry-Auth": auth },
      body: JSON.stringify(event),
    });
  } catch (postErr) {
    // Don't let observability failure mask real errors.
    console.warn("[sentry] failed to ship event:", postErr);
  }
}
