import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { env } from "@/lib/validators/env";

/**
 * Simula um webhook PAYMENT_RECEIVED chamando direto o handler.
 *
 * Uso: GET /api/debug/simulate-webhook?sub_id=<provider_subscription_id>
 *
 * Isso permite confirmar que o handler funciona corretamente,
 * isolando do problema "Asaas não está enviando webhook".
 *
 * Apaga depois de validar.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const subId = url.searchParams.get("sub_id");
  if (!subId) {
    return NextResponse.json({ error: "missing_sub_id" }, { status: 400 });
  }

  // Constrói um payload fake como o Asaas mandaria
  const fakePayload = {
    event: "PAYMENT_RECEIVED",
    payment: {
      subscription: subId,
      status: "RECEIVED",
      value: 699.9,
    },
  };

  // Chama o próprio webhook handler internamente (com o token correto)
  const webhookUrl = `${env.NEXT_PUBLIC_APP_URL}/api/webhooks/asaas`;
  let webhookResp;
  try {
    const r = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "asaas-access-token": env.ASAAS_WEBHOOK_TOKEN ?? "",
        "User-Agent": "memorial-ai/debug-simulator",
      },
      body: JSON.stringify(fakePayload),
    });
    const text = await r.text();
    webhookResp = { status: r.status, body: text };
  } catch (err) {
    webhookResp = { error: err instanceof Error ? err.message : String(err) };
  }

  // Mostra também o estado da subscription antes/depois
  const admin = createAdminClient();
  const { data: sub } = await admin
    .from("subscriptions")
    .select("id, plano, status, provider, provider_subscription_id, org_id")
    .eq("provider_subscription_id", subId)
    .maybeSingle();

  const { data: org } = sub
    ? await admin.from("organizations").select("plano, updated_at").eq("id", sub.org_id).single()
    : { data: null };

  return NextResponse.json({
    simulated_payload: fakePayload,
    webhook_response: webhookResp,
    current_subscription: sub,
    current_org_plano: org?.plano,
    note: "Se webhook_response.status == 200 e current_subscription.status == 'active', tudo OK. Se 401, token errado.",
  });
}
