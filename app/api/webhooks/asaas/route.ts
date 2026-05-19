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
 *   Notificações → Webhook → "Adicionar webhook"
 *   - URL: https://<seu-dominio>/api/webhooks/asaas
 *   - Token: o mesmo valor de ASAAS_WEBHOOK_TOKEN
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
  const hasToken = !!token;
  const hasExpected = !!env.ASAAS_WEBHOOK_TOKEN;
  const tokenMatch = hasExpected && token === env.ASAAS_WEBHOOK_TOKEN;

  console.log(
    `[asaas-webhook] received hasToken=${hasToken} hasExpected=${hasExpected} match=${tokenMatch}`,
  );

  // Captura todos os headers + payload pra debug.
  const headersObj: Record<string, string> = {};
  req.headers.forEach((v, k) => {
    headersObj[k] = v;
  });

  let rawBody: string | null = null;
  try {
    rawBody = await req.text();
  } catch {
    rawBody = null;
  }
  let parsedBody: AsaasEvent | null = null;
  try {
    parsedBody = rawBody ? (JSON.parse(rawBody) as AsaasEvent) : null;
  } catch {
    parsedBody = null;
  }

  const admin = createAdminClient();

  // Persiste o webhook no log (best-effort, não bloqueia se falhar).
  await admin
    .from("webhook_log")
    .insert({
      provider: "asaas",
      event: parsedBody?.event ?? null,
      authorized: tokenMatch,
      payload: parsedBody as unknown as Record<string, unknown> | null,
      headers: headersObj,
    })
    .then(({ error }) => {
      if (error) console.warn(`[asaas-webhook] log insert failed: ${error.message}`);
    });

  if (!hasExpected || !tokenMatch) {
    console.warn(
      `[asaas-webhook] UNAUTHORIZED — verifique ASAAS_WEBHOOK_TOKEN no Vercel e no painel Asaas`,
    );
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  if (!parsedBody) {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const body = parsedBody;
  const event = body.event;
  const now = new Date();

  console.log(
    `[asaas-webhook] event=${event} payment.sub=${body.payment?.subscription ?? "—"} sub.id=${body.subscription?.id ?? "—"}`,
  );

  // ====== PAYMENT_RECEIVED — pagamento confirmado, ativa plano ======
  if (event === "PAYMENT_RECEIVED" && body.payment?.subscription) {
    const subId = body.payment.subscription;
    const { data: sub } = await admin
      .from("subscriptions")
      .select("id, org_id, plano")
      .eq("provider_subscription_id", subId)
      .maybeSingle();
    if (!sub) {
      // Subscription criada manualmente direto no Asaas, sem record local.
      return NextResponse.json({ ok: true, ignored: "no_local_sub" });
    }
    const nextMonth = new Date(now);
    nextMonth.setUTCMonth(nextMonth.getUTCMonth() + 1);
    await admin
      .from("subscriptions")
      .update({
        status: "active",
        current_period_start: now.toISOString(),
        current_period_end: nextMonth.toISOString(),
        updated_at: now.toISOString(),
      })
      .eq("id", sub.id);
    await admin
      .from("organizations")
      .update({ plano: sub.plano as PlanId, updated_at: now.toISOString() })
      .eq("id", sub.org_id);
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
  if (event === "SUBSCRIPTION_DELETED" && body.subscription) {
    await admin
      .from("subscriptions")
      .update({ status: "canceled", updated_at: now.toISOString() })
      .eq("provider_subscription_id", body.subscription.id);
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
