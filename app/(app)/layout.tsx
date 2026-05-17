import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/features/shell/AppShell";

type Membership = {
  org_id: string;
  role: "owner" | "admin" | "member";
  organizations: { id: string; name: string };
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
    .select("org_id, role, organizations ( id, name )")
    .eq("user_id", user.id)
    .returns<Membership[]>();

  const currentMembership = memberships?.[0];
  if (!currentMembership) {
    // Trigger should have created the org; if not, surface a clear state.
    redirect("/login?error=no_org");
  }

  return (
    <AppShell
      userEmail={user.email ?? ""}
      orgName={currentMembership.organizations.name}
      role={currentMembership.role}
    >
      {children}
    </AppShell>
  );
}
