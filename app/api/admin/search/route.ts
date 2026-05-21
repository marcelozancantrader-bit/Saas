import { NextResponse, type NextRequest } from "next/server";
import { requirePlatformAdmin } from "@/lib/auth/platform-admin";
import { adminGlobalSearch } from "@/server/services/admin-search";

export async function GET(req: NextRequest) {
  await requirePlatformAdmin();
  const q = req.nextUrl.searchParams.get("q") ?? "";
  if (q.length < 2) return NextResponse.json({ hits: [] });

  const hits = await adminGlobalSearch(q);
  return NextResponse.json({ hits });
}
