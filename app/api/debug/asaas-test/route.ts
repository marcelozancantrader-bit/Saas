import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createOrFindCustomer, isAsaasEnabled } from "@/lib/billing/asaas";

/**
 * Diagnóstico real: tenta criar/buscar um customer test no Asaas sandbox
 * usando o e-mail do usuário logado. Não cria subscription real.
 *
 * Apagar depois de validar.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  if (!isAsaasEnabled()) {
    return NextResponse.json({ error: "asaas_not_enabled" }, { status: 503 });
  }

  // Tenta criar/buscar customer test
  const customer = await createOrFindCustomer({
    name: "Memorial.ai Debug Test",
    email: user.email ?? "debug@memorial.ai",
    externalReference: `debug-${user.id}`,
  });

  return NextResponse.json({
    enabled: isAsaasEnabled(),
    customer_result: customer,
    note: "Se ok: true, integração funciona. Se ok: false, error vai mostrar o problema.",
  });
}

export async function POST() {
  // Mesma coisa — proteção contra prefetch involuntário
  return GET();
}
