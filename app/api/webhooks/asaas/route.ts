import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { env } from "@/lib/validators/env";
import type { PlanId } from "@/lib/plans/limits";

/**
 * Sprint 7 — webhook Asaas.
 *
 * Asaas envia eventos POST aqui. Validamos via header `asaas-access-token`
 * comparado a ASAAS_WEBHOOK_TOKEN. Eventos relevantes:
 *   - SUBSCRIPTION_CREATED, SUBSCRIPTION_UPDATED, SUBSCRIPTION_DELETED
 *   - PAYMENT_RECEIVED, PAYMENT_OVERDUE, PAYMENT_REFUNDED
 *
 * Atualizamos subscriptions.status + organizations.plano conforme apropriado.
 * Idempotente — usa provider_subscription_id como chave.
 *
 * Docs: https://docs.asaas.com/reference/webhook
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
  // Auth: Asaas envia o token configurado no painel via header.
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

  if (event === "PAYMENT_RECEIVED" && body.payment?.subscription) {
    const subId = body.payment.subscription;
    const { data: sub } = await admin
      .from("subscriptions")
      .select("id, org_id, plano")
      .eq("provider_subscription_id", subId)
      .maybeSingle();
    if (sub) {
      const now = new Date();
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
      await admin.from("notifications").insert({
        org_id: sub.org_id,
        type: "plan.upgraded",
        title: `Pagamento confirmado: plano ${sub.plano}`,
        link_url: "/billing",
      });
    }
    return NextResponse.json({ ok: true });
  }

  if (event === "SUBSCRIPTION_DELETED" && body.subscription) {
    await admin
      .from("subscriptions")
      .update({ status: "canceled", updated_at: new Date().toISOString() })
      .eq("provider_subscription_id", body.subscription.id);
    return NextResponse.json({ ok: true });
  }

  if (event === "PAYMENT_OVERDUE" && body.payment?.subscription) {
    await admin
      .from("subscriptions")
      .update({ status: "past_due", updated_at: new Date().toISOString() })
      .eq("provider_subscription_id", body.payment.subscription);
    return NextResponse.json({ ok: true });
  }

  // Eventos não tratados são silenciosamente OK para evitar retries do Asaas.
  return NextResponse.json({ ok: true, ignored: event });
}
