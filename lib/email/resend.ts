import "server-only";
import { env } from "@/lib/validators/env";

/**
 * Cliente Resend leve (sem o SDK oficial — só HTTP) para não pesar bundle.
 * Se RESEND_API_KEY não estiver setado, a função vira no-op com warn.
 *
 * Endpoints: https://resend.com/docs/api-reference/emails/send-email
 */

type SendEmailInput = {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  /** Override do remetente. Default: env.RESEND_FROM_EMAIL */
  from?: string;
  /** Tag para tracking — Sprint 6 usa "portal.scope_change_requested" etc */
  tag?: string;
};

export type SendEmailResult =
  | { ok: true; id: string }
  | { ok: false; reason: "not_configured" | "api_error"; detail?: string };

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  if (!env.RESEND_API_KEY) {
    console.warn(`[email] RESEND_API_KEY not set; skipping ${input.tag ?? "email"}`);
    return { ok: false, reason: "not_configured" };
  }
  const from = input.from ?? env.RESEND_FROM_EMAIL;
  if (!from) {
    console.warn("[email] RESEND_FROM_EMAIL not set; skipping email");
    return { ok: false, reason: "not_configured" };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
      tags: input.tag ? [{ name: "type", value: input.tag }] : undefined,
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    return { ok: false, reason: "api_error", detail: detail.slice(0, 500) };
  }
  const body = (await response.json()) as { id: string };
  return { ok: true, id: body.id };
}
