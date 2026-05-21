import { NextResponse, type NextRequest } from "next/server";
import { requirePlatformAdmin } from "@/lib/auth/platform-admin";
import { exportAuditCsv } from "@/server/services/admin-audit";

export async function GET(req: NextRequest) {
  await requirePlatformAdmin();
  const sp = req.nextUrl.searchParams;

  const csv = await exportAuditCsv({
    q: sp.get("q") ?? undefined,
    action: sp.get("action") ?? undefined,
    actor_type: sp.get("actor_type") ?? undefined,
    org_id: sp.get("org_id") ?? undefined,
    from: sp.get("from") ?? undefined,
    to: sp.get("to") ?? undefined,
  });

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="audit-log-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
