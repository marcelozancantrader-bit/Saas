import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentOrg } from "@/server/services/current-org";

/**
 * Diagnóstico: mostra estado recente da org logada em billing+notifications.
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

  const me = await getCurrentOrg();
  const admin = createAdminClient();

  const [{ data: org }, { data: subs }, { data: notifs }] = await Promise.all([
    admin
      .from("organizations")
      .select("id, name, plano, cnpj, updated_at")
      .eq("id", me.orgId)
      .single(),
    admin
      .from("subscriptions")
      .select(
        "id, plano, status, provider, provider_subscription_id, current_period_end, created_at, updated_at",
      )
      .eq("org_id", me.orgId)
      .order("created_at", { ascending: false })
      .limit(5),
    admin
      .from("notifications")
      .select("id, type, title, created_at, read_at")
      .eq("org_id", me.orgId)
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  return NextResponse.json({
    org,
    subscriptions: subs ?? [],
    notifications: notifs ?? [],
    hint: "Se subscription está 'pending' = webhook ainda não bateu. Se 'active' = sucesso.",
  });
}
