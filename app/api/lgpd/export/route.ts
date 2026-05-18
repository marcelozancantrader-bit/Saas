import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { exportUserDataAsJson } from "@/server/services/lgpd-export";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Sprint 8 — LGPD export endpoint.
 *
 * GET /api/lgpd/export → application/json download contendo TODOS os dados do
 * usuário e das organizações em que é membro.
 *
 * Apenas autenticado. Não tem rate-limit; uso esporádico (1x por usuário).
 */

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const result = await exportUserDataAsJson(user.id, user.email ?? "");
  const filename = `memorial-ai-export-${user.id.slice(0, 8)}-${Date.now()}.json`;
  return new NextResponse(JSON.stringify(result, null, 2), {
    status: 200,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="${filename}"`,
      "cache-control": "no-store",
    },
  });
}
