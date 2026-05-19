import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Lista os últimos 20 webhooks recebidos (de qualquer provider).
 * Permite confirmar se o Asaas está enviando — se não houver registros após
 * uma simulação de pagamento, é porque o webhook não foi configurado/
 * disparado pelo Asaas. Se houver com authorized=false, é token errado.
 *
 * Apaga depois de validar.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("webhook_log")
    .select("id, provider, event, authorized, created_at, payload")
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    total: data?.length ?? 0,
    history: data ?? [],
    hint: "Se total=0 após simular pagamento no Asaas, o webhook não está chegando — verifique configuração no painel Asaas.",
  });
}
