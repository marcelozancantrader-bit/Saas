import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/features/shell/AppShell";
import { loadRecentNotifications } from "@/server/services/notifications-load";
import { loadActiveAnnouncements } from "@/server/services/announcements-load";
import { isPlatformAdmin } from "@/lib/auth/platform-admin";
import type { PlanId } from "@/lib/plans/limits";

type Membership = {
  org_id: string;
  role: "owner" | "admin" | "member";
  organizations: { id: string; name: string; plano: PlanId };
};

export default async function ProtectedLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();

  // Defense-in-depth — the proxy already gates this route, but a missing user here means
  // either a race during cookie refresh or someone bypassing the proxy. Either way, redirect.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: memberships } = await supabase
    .from("organization_members")
    .select("org_id, role, organizations ( id, name, plano )")
    .eq("user_id", user.id)
    .returns<Membership[]>();

  const currentMembership = memberships?.[0];
  if (!currentMembership) {
    // Trigger should have created the org; if not, surface a clear state.
    redirect("/login?error=no_org");
  }

  const orgPlano = currentMembership.organizations.plano ?? "free";

  const [notifications, platformAdmin, announcements] = await Promise.all([
    loadRecentNotifications(),
    isPlatformAdmin(user.id),
    loadActiveAnnouncements(currentMembership.organizations.id, orgPlano),
  ]);

  return (
    <AppShell
      userId={user.id}
      userEmail={user.email ?? ""}
      orgId={currentMembership.organizations.id}
      orgName={currentMembership.organizations.name}
      plano={orgPlano}
      role={currentMembership.role}
      notifications={notifications}
      announcements={announcements}
      isPlatformAdmin={platformAdmin}
    >
      {children}
    </AppShell>
  );
}
