import "server-only";
import { inngest } from "@/lib/inngest/client";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Cron diário que finaliza cancelamentos agendados.
 *
 * Quando o usuário cancela o plano via /billing, marcamos:
 *   - `subscriptions.cancel_at_period_end = true`
 *   - mantemos `status='active'` até o fim do período já pago
 *
 * Este cron roda 1x/dia e:
 *   - Encontra subs com cancel_at_period_end=true cujo current_period_end já passou
 *   - Marca status='canceled'
 *   - Downgrade organizations.plano pra 'free'
 *   - Cria notification informando o downgrade
 */
export const expiredCancellationsCron = inngest.createFunction(
  {
    id: "expired-cancellations-cron",
    name: "Finalizar cancelamentos agendados",
    retries: 2,
    triggers: [{ cron: "TZ=America/Sao_Paulo 30 9 * * *" }],
  },
  async ({ step, logger }) => {
    const admin = createAdminClient();
    const now = new Date();

    const processed = await step.run("downgrade-expired", async () => {
      const { data: expired, error } = await admin
        .from("subscriptions")
        .select("id, org_id, plano, current_period_end")
        .eq("cancel_at_period_end", true)
        .eq("status", "active")
        .lt("current_period_end", now.toISOString())
        .limit(500);

      if (error) throw new Error(`Query expired cancellations: ${error.message}`);
      if (!expired || expired.length === 0) return 0;

      let count = 0;
      for (const sub of expired) {
        const orgId = sub.org_id as string;
        const subId = sub.id as string;
        const previousPlano = sub.plano as string;

        const { error: subErr } = await admin
          .from("subscriptions")
          .update({ status: "canceled", updated_at: now.toISOString() })
          .eq("id", subId);
        if (subErr) {
          logger.error(`[expired-cancel] sub ${subId} update failed: ${subErr.message}`);
          continue;
        }

        const { error: orgErr } = await admin
          .from("organizations")
          .update({ plano: "free", updated_at: now.toISOString() })
          .eq("id", orgId);
        if (orgErr) {
          logger.error(`[expired-cancel] org ${orgId} downgrade failed: ${orgErr.message}`);
          continue;
        }

        await admin.from("notifications").insert({
          org_id: orgId,
          user_id: null,
          type: "plan.upgraded",
          title: "Plano cancelado",
          body: `Seu plano ${previousPlano} encerrou. O workspace voltou pro Free. Re-assine a qualquer momento em /billing.`,
          link_url: "/billing",
          meta: { previous_plano: previousPlano, subscription_id: subId },
        });

        count++;
      }

      return count;
    });

    logger.info(`Cron expired-cancellations: ${processed} subs downgrade pra free`);
    return { processed };
  },
);
