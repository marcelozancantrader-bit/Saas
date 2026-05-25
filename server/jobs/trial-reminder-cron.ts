import "server-only";
import { inngest } from "@/lib/inngest/client";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email/resend";
import { renderTrialReminderEmail } from "@/lib/email/templates";
import { PLANS } from "@/lib/plans/limits";
import { TRIAL_PLAN } from "@/lib/billing/trial";

/**
 * Cron diário que avisa orgs com trial acabando em ~24h.
 *
 * Roda às 9:30 BRT, antes do expired-trials-cron (9:35). Busca subs trialing
 * com current_period_end entre 12h e 36h no futuro — janela de captura ampla
 * pra cobrir orgs que iniciaram em horários diferentes do dia. Dedup por
 * `meta.reminder_sent_at` (1 reminder por trial).
 *
 * Efeitos por org:
 *   - e-mail Resend (gated) pros owners/admins
 *   - notification org-wide
 *   - sub.meta.reminder_sent_at marca para dedup
 *
 * Conversão extra esperada: literatura SaaS aponta 15-30% de uplift quando o
 * usuário recebe um nudge no D-1 do trial.
 */
export const trialReminderCron = inngest.createFunction(
  {
    id: "trial-reminder-cron",
    name: "Avisar trial acabando em 24h",
    retries: 2,
    triggers: [{ cron: "TZ=America/Sao_Paulo 30 9 * * *" }],
  },
  async ({ step, logger }) => {
    const admin = createAdminClient();
    const now = new Date();
    const lowerBound = new Date(now.getTime() + 12 * 60 * 60 * 1000);
    const upperBound = new Date(now.getTime() + 36 * 60 * 60 * 1000);

    const processed = await step.run("notify-expiring-trials", async () => {
      const { data: rows, error } = await admin
        .from("subscriptions")
        .select("id, org_id, current_period_end, meta")
        .eq("status", "trialing")
        .eq("provider", "trial")
        .gte("current_period_end", lowerBound.toISOString())
        .lt("current_period_end", upperBound.toISOString())
        .limit(500);

      if (error) throw new Error(`Query expiring trials: ${error.message}`);
      if (!rows || rows.length === 0) return 0;

      let count = 0;
      for (const sub of rows) {
        const subId = sub.id as string;
        const orgId = sub.org_id as string;
        const cpe = sub.current_period_end as string | null;
        if (!cpe) continue;

        const meta = ((sub.meta as Record<string, unknown> | null) ?? {}) as Record<
          string,
          unknown
        >;
        if (meta.reminder_sent_at) continue; // dedup

        const endsAt = new Date(cpe);

        await admin.from("notifications").insert({
          org_id: orgId,
          user_id: null,
          type: "plan.trial_ending_soon",
          title: `Trial ${PLANS[TRIAL_PLAN].label} acaba amanhã`,
          body: `Em menos de 24h o workspace volta pro Free. Assine agora pra manter projetos ilimitados, portal do cliente e branding.`,
          link_url: "/billing",
          meta: { trial_ends_at: endsAt.toISOString() },
        });

        await sendReminderEmail(orgId, endsAt).catch((err) => {
          logger.warn(`[trial-reminder] email org ${orgId} failed: ${(err as Error).message}`);
        });

        await admin
          .from("subscriptions")
          .update({
            meta: { ...meta, reminder_sent_at: now.toISOString() },
            updated_at: now.toISOString(),
          })
          .eq("id", subId);

        count++;
      }

      return count;
    });

    logger.info(`Cron trial-reminder: ${processed} avisos enviados`);
    return { processed };
  },
);

async function sendReminderEmail(orgId: string, endsAt: Date): Promise<void> {
  const admin = createAdminClient();

  const { data: org } = await admin
    .from("organizations")
    .select("name")
    .eq("id", orgId)
    .single<{ name: string }>();
  if (!org) return;

  const { data: owners } = await admin
    .from("organization_members")
    .select("user_id, role")
    .eq("org_id", orgId)
    .in("role", ["owner", "admin"]);
  if (!owners || owners.length === 0) return;

  const emails: string[] = [];
  for (const o of owners) {
    const { data, error } = await admin.auth.admin.getUserById(o.user_id as string);
    if (error || !data.user?.email) continue;
    emails.push(data.user.email);
  }
  if (emails.length === 0) return;

  const { html, text, subject } = renderTrialReminderEmail({
    orgName: org.name,
    planLabel: PLANS[TRIAL_PLAN].label,
    endsAt,
    billingUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? "https://memorial-ai-mu.vercel.app"}/billing`,
  });

  await sendEmail({
    to: emails,
    subject,
    html,
    text,
    tag: "plan.trial_ending_soon",
  });
}
