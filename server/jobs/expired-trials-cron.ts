import "server-only";
import { inngest } from "@/lib/inngest/client";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email/resend";
import { renderTrialExpiredEmail } from "@/lib/email/templates";
import { PLANS } from "@/lib/plans/limits";
import { TRIAL_PLAN } from "@/lib/billing/trial";

/**
 * Cron diário que finaliza trials expirados.
 *
 * Trial = subscription com status='trialing', provider='trial'. Quando
 * current_period_end < now, downgrade pra free:
 *   - subscriptions.status = 'canceled'
 *   - organizations.plano = 'free'
 *   - notification org-wide
 *   - e-mail pros owners da org (gated em RESEND_*)
 *
 * Roda às 9:35 BRT pra evitar coincidência com expired-cancellations (9:30).
 * organizations.trial_started_at NÃO é resetado — é histórico anti-abuse.
 */
export const expiredTrialsCron = inngest.createFunction(
  {
    id: "expired-trials-cron",
    name: "Finalizar trials expirados",
    retries: 2,
    triggers: [{ cron: "TZ=America/Sao_Paulo 35 9 * * *" }],
  },
  async ({ step, logger }) => {
    const admin = createAdminClient();
    const now = new Date();

    const processed = await step.run("downgrade-expired-trials", async () => {
      const { data: expired, error } = await admin
        .from("subscriptions")
        .select("id, org_id, plano, current_period_end")
        .eq("status", "trialing")
        .eq("provider", "trial")
        .lt("current_period_end", now.toISOString())
        .limit(500);

      if (error) throw new Error(`Query expired trials: ${error.message}`);
      if (!expired || expired.length === 0) return 0;

      let count = 0;
      for (const sub of expired) {
        const orgId = sub.org_id as string;
        const subId = sub.id as string;

        const { error: subErr } = await admin
          .from("subscriptions")
          .update({ status: "canceled", updated_at: now.toISOString() })
          .eq("id", subId);
        if (subErr) {
          logger.error(`[expired-trial] sub ${subId} update failed: ${subErr.message}`);
          continue;
        }

        const { error: orgErr } = await admin
          .from("organizations")
          .update({ plano: "free", updated_at: now.toISOString() })
          .eq("id", orgId);
        if (orgErr) {
          logger.error(`[expired-trial] org ${orgId} downgrade failed: ${orgErr.message}`);
          continue;
        }

        await admin.from("notifications").insert({
          org_id: orgId,
          user_id: null,
          type: "plan.trial_expired",
          title: `Trial ${PLANS[TRIAL_PLAN].label} encerrado`,
          body: `Seu período de teste acabou. O workspace voltou pro Free — alguns limites foram reativados. Assine ${PLANS[TRIAL_PLAN].label} pra continuar com tudo desbloqueado.`,
          link_url: "/billing",
          meta: { previous_plano: TRIAL_PLAN, subscription_id: subId },
        });

        await admin.from("audit_log").insert({
          org_id: orgId,
          actor_id: null,
          actor_type: "system",
          action: "subscription.trial_expired",
          entity_type: "subscription",
          entity_id: subId,
          payload: { plano: TRIAL_PLAN, expired_at: now.toISOString() },
        });

        // E-mail pros owners (gated). Falha silenciosa — cron continua.
        await sendTrialExpiredEmail(orgId).catch((err) => {
          logger.warn(`[expired-trial] email org ${orgId} failed: ${(err as Error).message}`);
        });

        count++;
      }

      return count;
    });

    logger.info(`Cron expired-trials: ${processed} trials encerrados`);
    return { processed };
  },
);

async function sendTrialExpiredEmail(orgId: string): Promise<void> {
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

  const userIds = owners.map((o) => o.user_id as string);
  // Resolve e-mails via Auth admin API (1 chamada por user — listas pequenas).
  const emails: string[] = [];
  for (const uid of userIds) {
    const { data, error } = await admin.auth.admin.getUserById(uid);
    if (error || !data.user?.email) continue;
    emails.push(data.user.email);
  }
  if (emails.length === 0) return;

  const { html, text, subject } = renderTrialExpiredEmail({
    orgName: org.name,
    planLabel: PLANS[TRIAL_PLAN].label,
    billingUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? "https://memorial-ai-mu.vercel.app"}/billing`,
  });

  await sendEmail({
    to: emails,
    subject,
    html,
    text,
    tag: "plan.trial_expired",
  });
}
