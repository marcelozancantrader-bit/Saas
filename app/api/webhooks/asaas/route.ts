import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { env } from "@/lib/validators/env";
import { PLANS, type PlanId } from "@/lib/plans/limits";

/**
 * Webhook Asaas.
 *
 * Asaas envia eventos POST aqui. Validamos via header `asaas-access-token`
 * comparado a ASAAS_WEBHOOK_TOKEN. Eventos tratados:
 *   - PAYMENT_RECEIVED      → ativa subscription + organizations.plano + notification
 *                              + cancela subscriptions ativas anteriores da mesma org
 *   - PAYMENT_OVERDUE       → status='past_due' (cliente vê na tela de billing)
 *   - PAYMENT_REFUNDED      → status='canceled' + downgrade org pra free
 *   - SUBSCRIPTION_DELETED  → status='canceled'
 *   - SUBSCRIPTION_UPDATED  → atualiza next_due_date e valor cached
 *
 * Idempotente — usa provider_subscription_id como chave de busca.
 *
 * Docs: https://docs.asaas.com/reference/webhook
 *
 * **Setup no painel Asaas:**
 *   Integrações → Webhooks → "Adicionar webhook"
 *   - URL: https://<seu-dominio>/api/webhooks/asaas
 *   - Token: o mesmo valor de ASAAS_WEBHOOK_TOKEN
 *   - Ambos toggles ATIVOS ("Este webhook ficará ativo?" + "Fila de sincronização ativada?")
 *   - Eventos: marcar pelo menos PAYMENT_RECEIVED, PAYMENT_OVERDUE,
 *     PAYMENT_REFUNDED, SUBSCRIPTION_DELETED, SUBSCRIPTION_UPDATED
 */

export const runtime = "nodejs";

type AsaasEvent = {
  event: string;
  payment?: {
    subscription?: string;
    status?: string;
    value?: number;
  };
  subscription?: {
    id: string;
    status: string;
    externalReference?: string;
    nextDueDate?: string;
    value?: number;
  };
};

export async function POST(req: NextRequest) {
  const token = req.headers.get("asaas-access-token");
  if (!env.ASAAS_WEBHOOK_TOKEN || token !== env.ASAAS_WEBHOOK_TOKEN) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: AsaasEvent;
  try {
    body = (await req.json()) as AsaasEvent;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const admin = createAdminClient();
  const event = body.event;
  const now = new Date();

  // ====== PAYMENT_RECEIVED — pagamento confirmado, ativa plano ======
  if (event === "PAYMENT_RECEIVED" && body.payment?.subscription) {
    const subId = body.payment.subscription;
    const { data: sub } = await admin
      .from("subscriptions")
      .select("id, org_id, plano")
      .eq("provider_subscription_id", subId)
      .maybeSingle();
    if (!sub) {
      return NextResponse.json({ ok: true, ignored: "no_local_sub" });
    }
    const nextMonth = new Date(now);
    nextMonth.setUTCMonth(nextMonth.getUTCMonth() + 1);

    // 1. Ativa a subscription que acabou de ser paga.
    await admin
      .from("subscriptions")
      .update({
        status: "active",
        current_period_start: now.toISOString(),
        current_period_end: nextMonth.toISOString(),
        updated_at: now.toISOString(),
      })
      .eq("id", sub.id);

    // 2. Cancela quaisquer outras subscriptions active da MESMA org —
    //    não faz sentido ter 2 active simultâneas.
    await admin
      .from("subscriptions")
      .update({ status: "canceled", updated_at: now.toISOString() })
      .eq("org_id", sub.org_id)
      .eq("status", "active")
      .neq("id", sub.id);

    // 3. Atualiza org.plano.
    await admin
      .from("organizations")
      .update({ plano: sub.plano as PlanId, updated_at: now.toISOString() })
      .eq("id", sub.org_id);

    // 4. Notifica.
    const planLabel = PLANS[sub.plano as PlanId]?.label ?? sub.plano;
    await admin.from("notifications").insert({
      org_id: sub.org_id,
      type: "plan.upgraded",
      title: `Pagamento confirmado: plano ${planLabel}`,
      body: "Sua assinatura está ativa. Bom trabalho!",
      link_url: "/billing",
    });
    return NextResponse.json({ ok: true, event });
  }

  // ====== PAYMENT_OVERDUE — cliente atrasou ======
  if (event === "PAYMENT_OVERDUE" && body.payment?.subscription) {
    await admin
      .from("subscriptions")
      .update({ status: "past_due", updated_at: now.toISOString() })
      .eq("provider_subscription_id", body.payment.subscription);
    return NextResponse.json({ ok: true, event });
  }

  // ====== PAYMENT_REFUNDED — estornou: cancela e volta pro Free ======
  if (event === "PAYMENT_REFUNDED" && body.payment?.subscription) {
    const subId = body.payment.subscription;
    const { data: sub } = await admin
      .from("subscriptions")
      .select("id, org_id")
      .eq("provider_subscription_id", subId)
      .maybeSingle();
    if (sub) {
      await admin
        .from("subscriptions")
        .update({ status: "canceled", updated_at: now.toISOString() })
        .eq("id", sub.id);
      await admin
        .from("organizations")
        .update({ plano: "free", updated_at: now.toISOString() })
        .eq("id", sub.org_id);
      await admin.from("notifications").insert({
        org_id: sub.org_id,
        type: "plan.upgraded",
        title: "Pagamento estornado — voltando para Free",
        body: "Sua organização voltou ao plano Free. Você pode re-assinar a qualquer momento.",
        link_url: "/billing",
      });
    }
    return NextResponse.json({ ok: true, event });
  }

  // ====== SUBSCRIPTION_DELETED — assinatura cancelada ======
  // Pode ter sido (a) cancelamento agendado pelo user via /billing — nesse caso
  // já marcamos cancel_at_period_end=true e mantemos acesso até fim do período
  // (cron expired-cancellations finaliza); ou (b) cancelamento externo (painel
  // Asaas, refund, etc.) — nesse caso fazemos downgrade imediato pra free.
  if (event === "SUBSCRIPTION_DELETED" && body.subscription) {
    const { data: sub } = await admin
      .from("subscriptions")
      .select("id, org_id, cancel_at_period_end, current_period_end")
      .eq("provider_subscription_id", body.subscription.id)
      .maybeSingle();
    if (!sub) return NextResponse.json({ ok: true, ignored: "no_local_sub" });

    const userScheduled = sub.cancel_at_period_end === true;
    const periodStillValid =
      !!sub.current_period_end && new Date(sub.current_period_end as string) > now;

    if (userScheduled && periodStillValid) {
      return NextResponse.json({
        ok: true,
        kept_until: sub.current_period_end,
        note: "cancelamento_agendado_pelo_user",
      });
    }

    await admin
      .from("subscriptions")
      .update({ status: "canceled", updated_at: now.toISOString() })
      .eq("id", sub.id);
    await admin
      .from("organizations")
      .update({ plano: "free", updated_at: now.toISOString() })
      .eq("id", sub.org_id);
    return NextResponse.json({ ok: true, event });
  }

  // ====== SUBSCRIPTION_UPDATED — atualizou próximo vencimento ou valor ======
  if (event === "SUBSCRIPTION_UPDATED" && body.subscription) {
    const next = body.subscription.nextDueDate;
    await admin
      .from("subscriptions")
      .update({
        current_period_end: next ? new Date(next).toISOString() : undefined,
        updated_at: now.toISOString(),
      })
      .eq("provider_subscription_id", body.subscription.id);
    return NextResponse.json({ ok: true, event });
  }

  // Eventos não tratados são silenciosamente OK pra evitar retries do Asaas.
  return NextResponse.json({ ok: true, ignored: event });
}
