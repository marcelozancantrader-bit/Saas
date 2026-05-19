import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { upgradePlanAction } from "@/server/actions/billing/upgrade-plan.action";
import { isAsaasEnabled } from "@/lib/billing/asaas";
import { env } from "@/lib/validators/env";
import { PLANS } from "@/lib/plans/limits";

/**
 * Diagnóstico do fluxo de upgrade. Dispara a server action diretamente e
 * retorna o resultado bruto + os fatores de decisão.
 *
 * Uso: /api/debug/test-upgrade?plan=standard
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
  const planParam = url.searchParams.get("plan") ?? "standard";
  const validPlans = ["free", "standard", "pro", "pro_max", "agency"] as const;
  if (!validPlans.includes(planParam as (typeof validPlans)[number])) {
    return NextResponse.json({ error: "invalid_plan" }, { status: 400 });
  }
  const targetPlan = planParam as (typeof validPlans)[number];

  // Captura fatores de decisão ANTES de chamar a action
  const planInfo = PLANS[targetPlan];
  const wantsAsaas =
    isAsaasEnabled() && targetPlan !== "free" && targetPlan !== "agency" && !!planInfo.priceCents;

  // Chama a action
  const result = await upgradePlanAction({ target_plan: targetPlan });

  return NextResponse.json({
    debug: {
      target_plan: targetPlan,
      asaas_enabled: isAsaasEnabled(),
      asaas_environment: env.ASAAS_ENVIRONMENT,
      api_key_present: !!env.ASAAS_API_KEY,
      webhook_token_present: !!env.ASAAS_WEBHOOK_TOKEN,
      plan_price_cents: planInfo.priceCents,
      should_take_asaas_path: wantsAsaas,
    },
    action_result: result,
  });
}
