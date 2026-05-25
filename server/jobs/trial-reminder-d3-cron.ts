import "server-only";
import { inngest } from "@/lib/inngest/client";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email/resend";
import { renderTrialReminderD3Email } from "@/lib/email/templates";
import { PLANS } from "@/lib/plans/limits";
import { TRIAL_PLAN } from "@/lib/billing/trial";

/**
 * Cron diário que avisa orgs com trial acabando em ~3 dias.
 *
 * Roda às 9:25 BRT, antes do D-1 (9:30) e do expired-trials (9:35). Janela:
 * `current_period_end` entre 60h e 84h no futuro (3 dias ± 12h). Dedup por
 * `meta.reminder_d3_sent_at` (chave separada do reminder D-1).
 *
 * Conversão extra esperada: literatura SaaS mostra que múltiplos toques
 * (D-3, D-1, expirado) somam +10-20% sobre só o D-1 isolado.
 */
export const trialReminderD3Cron = inngest.createFunction(
  {
    id: "trial-reminder-d3-cron",
    name: "Avisar trial acabando em 3 dias",
    retries: 2,
    triggers: [{ cron: "TZ=America/Sao_Paulo 25 9 * * *" }],
  },
  async ({ step, logger }) => {
    const admin = createAdminClient();
    const now = new Date();
    const lowerBound = new Date(now.getTime() + 60 * 60 * 60 * 1000);
    const upperBound = new Date(now.getTime() + 84 * 60 * 60 * 1000);

    const processed = await step.run("notify-expiring-trials-d3", async () => {
      const { data: rows, error } = await admin
        .from("subscriptions")
        .select("id, org_id, current_period_end, meta")
        .eq("status", "trialing")
        .eq("provider", "trial")
        .gte("current_period_end", lowerBound.toISOString())
        .lt("current_period_end", upperBound.toISOString())
        .limit(500);

      if (error) throw new Error(`Query expiring trials D-3: ${error.message}`);
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
        // Dedup com chave separada do D-1 (reminder_sent_at).
        if (meta.reminder_d3_sent_at) continue;

        const endsAt = new Date(cpe);

        await admin.from("notifications").insert({
          org_id: orgId,
          user_id: null,
          type: "plan.trial_ending_soon",
          title: `Trial ${PLANS[TRIAL_PLAN].label} acaba em 3 dias`,
          body: `Última semana pra testar tudo. Assine antes pra manter o desconto anual.`,
          link_url: "/billing",
          meta: { trial_ends_at: endsAt.toISOString(), nudge: "d3" },
        });

        await sendD3Email(orgId, endsAt).catch((err) => {
          logger.warn(`[trial-reminder-d3] email org ${orgId} failed: ${(err as Error).message}`);
        });

        await admin
          .from("subscriptions")
          .update({
            meta: { ...meta, reminder_d3_sent_at: now.toISOString() },
            updated_at: now.toISOString(),
          })
          .eq("id", subId);

        count++;
      }

      return count;
    });

    logger.info(`Cron trial-reminder-d3: ${processed} avisos enviados`);
    return { processed };
  },
);

async function sendD3Email(orgId: string, endsAt: Date): Promise<void> {
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

  const { html, text, subject } = renderTrialReminderD3Email({
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
    tag: "plan.trial_ending_soon_d3",
  });
}
