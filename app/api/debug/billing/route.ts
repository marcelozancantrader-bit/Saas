import { NextResponse } from "next/server";
import { env } from "@/lib/validators/env";
import { isAsaasEnabled } from "@/lib/billing/asaas";
import { createClient } from "@/lib/supabase/server";

/**
 * Endpoint de diagnóstico — exposto APENAS para usuário autenticado.
 * Retorna estado das envs de billing sem revelar valores.
 * Apaga este arquivo depois de validar o setup.
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

  return NextResponse.json({
    asaas: {
      enabled: isAsaasEnabled(),
      api_key_present: !!env.ASAAS_API_KEY,
      api_key_starts_with: env.ASAAS_API_KEY?.slice(0, 12) ?? null,
      api_key_length: env.ASAAS_API_KEY?.length ?? 0,
      webhook_token_present: !!env.ASAAS_WEBHOOK_TOKEN,
      webhook_token_length: env.ASAAS_WEBHOOK_TOKEN?.length ?? 0,
      environment: env.ASAAS_ENVIRONMENT,
    },
    runtime_node_version: process.version,
    vercel_env: process.env.VERCEL_ENV ?? "unknown",
  });
}
