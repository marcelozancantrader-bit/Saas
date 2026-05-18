import "server-only";
import { createClient } from "@/lib/supabase/server";

export type MembershipRole = "owner" | "admin" | "member";

export type CurrentOrgMembership = {
  userId: string;
  email: string;
  orgId: string;
  orgName: string;
  role: MembershipRole;
};

export class NoCurrentOrgError extends Error {
  constructor(reason: "no_user" | "no_membership") {
    super(reason);
    this.name = "NoCurrentOrgError";
  }
}

/**
 * Returns the authenticated user's primary org membership.
 * Throws NoCurrentOrgError if no user or no membership row.
 *
 * Use in Server Actions where the action target must belong to the user's org.
 * RLS still gates the final query — this is just for explicit `org_id` injection on inserts.
 */
export async function getCurrentOrg(): Promise<CurrentOrgMembership> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new NoCurrentOrgError("no_user");

  const { data, error } = await supabase
    .from("organization_members")
    .select("org_id, role, organizations ( id, name )")
    .eq("user_id", user.id)
    .limit(1)
    .returns<
      Array<{
        org_id: string;
        role: MembershipRole;
        organizations: { id: string; name: string };
      }>
    >();

  if (error || !data || data.length === 0) {
    throw new NoCurrentOrgError("no_membership");
  }
  const m = data[0]!;

  return {
    userId: user.id,
    email: user.email ?? "",
    orgId: m.org_id,
    orgName: m.organizations.name,
    role: m.role,
  };
}
