import "server-only";
import { sendEmail } from "@/lib/email/resend";
import { SUPPORT_EMAIL, PRODUCT_NAME } from "@/lib/branding";
import { sendEmailAdminConfigSchema } from "../types";
import { resolveTemplate, type ActionContext, type ActionResult } from "./index";

export async function runSendEmailAdmin(
  config: Record<string, unknown>,
  ctx: ActionContext,
): Promise<ActionResult> {
  const parsed = sendEmailAdminConfigSchema.safeParse(config);
  if (!parsed.success) {
    return { ok: false, error: `Config inválida: ${parsed.error.issues[0]?.message ?? "?"}` };
  }

  const subject = resolveTemplate(parsed.data.subject, ctx);
  const body = resolveTemplate(parsed.data.body, ctx);

  const html = `
    <div style="font-family:-apple-system,sans-serif;max-width:560px;padding:24px;color:#18181b;">
      <p style="font-size:13px;color:#71717a;margin:0 0 8px;">${PRODUCT_NAME} · admin automation</p>
      <h2 style="font-size:16px;margin:0 0 16px;color:#0f172a;">${escapeHtml(subject)}</h2>
      <div style="font-size:14px;line-height:1.6;white-space:pre-wrap;">${escapeHtml(body)}</div>
    </div>
  `;

  const r = await sendEmail({
    to: SUPPORT_EMAIL,
    subject: `[admin] ${subject}`,
    html,
    text: body,
    tag: "admin.automation",
  });

  if (!r.ok) {
    return {
      ok: false,
      error:
        r.reason === "not_configured" ? "RESEND_API_KEY não setada" : (r.detail ?? "Falha Resend"),
    };
  }
  return { ok: true, output: { email_id: r.id, to: SUPPORT_EMAIL } };
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    c === "&" ? "&amp;" : c === "<" ? "&lt;" : c === ">" ? "&gt;" : c === '"' ? "&quot;" : "&#39;",
  );
}
