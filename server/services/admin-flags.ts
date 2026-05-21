import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export type FeatureFlagRow = {
  id: string;
  org_id: string | null;
  org_name: string | null;
  key: string;
  value: unknown;
  expires_at: string | null;
  notes: string | null;
  created_at: string;
};

export async function loadFeatureFlags(): Promise<FeatureFlagRow[]> {
  const supabase = createAdminClient();
  const { data: flags } = await supabase
    .from("feature_flags")
    .select("id, org_id, key, value, expires_at, notes, created_at")
    .order("created_at", { ascending: false });

  const flagsTyped = (flags ?? []) as Omit<FeatureFlagRow, "org_name">[];

  const orgIds = Array.from(
    new Set(flagsTyped.map((f) => f.org_id).filter((id): id is string => !!id)),
  );
  const orgNameById = new Map<string, string>();
  if (orgIds.length > 0) {
    const { data: orgs } = await supabase.from("organizations").select("id, name").in("id", orgIds);
    for (const o of (orgs ?? []) as { id: string; name: string }[]) {
      orgNameById.set(o.id, o.name);
    }
  }

  return flagsTyped.map((f) => ({
    ...f,
    org_name: f.org_id ? (orgNameById.get(f.org_id) ?? null) : null,
  }));
}

export type AnnouncementRow = {
  id: string;
  title: string;
  body: string;
  severity: "info" | "success" | "warning" | "error";
  audience: string;
  link_url: string | null;
  starts_at: string;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
};

export async function loadAnnouncements(): Promise<AnnouncementRow[]> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("announcements")
    .select(
      "id, title, body, severity, audience, link_url, starts_at, expires_at, is_active, created_at",
    )
    .order("created_at", { ascending: false });
  return (data ?? []) as AnnouncementRow[];
}
