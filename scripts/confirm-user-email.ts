/**
 * One-off admin script: confirms a user's email so they can log in.
 *
 * Use until Sprint 6 (Resend integration) sets up proper email confirmation.
 *
 * Run: npx tsx scripts/confirm-user-email.ts <email>
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadEnv() {
  const envPath = resolve(process.cwd(), ".env.local");
  const text = readFileSync(envPath, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
    if (m && !process.env[m[1]!]) process.env[m[1]!] = m[2];
  }
}
loadEnv();

const emailArg = process.argv[2];
if (!emailArg) {
  console.error("Usage: npx tsx scripts/confirm-user-email.ts <email>");
  process.exit(1);
}
const email: string = emailArg;

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

async function main() {
  // Find the user by listing (admin.listUsers + filter — Supabase has no native
  // "find by email" admin endpoint that takes email as arg)
  const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  if (error) {
    console.error("listUsers error:", error.message);
    process.exit(1);
  }
  const user = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  if (!user) {
    console.error(`No user found with email ${email}`);
    process.exit(1);
  }

  console.log(`Found user ${user.id}`);
  console.log(`  email: ${user.email}`);
  console.log(`  email_confirmed_at: ${user.email_confirmed_at ?? "(null — not confirmed)"}`);
  console.log(`  created_at: ${user.created_at}`);

  if (user.email_confirmed_at) {
    console.log("Already confirmed. Login should work — check password.");
    process.exit(0);
  }

  const { error: updateError } = await admin.auth.admin.updateUserById(user.id, {
    email_confirm: true,
  });
  if (updateError) {
    console.error("updateUser error:", updateError.message);
    process.exit(1);
  }

  // Also verify the trigger created their org + membership
  const { data: memberships } = await admin
    .from("organization_members")
    .select("org_id, role, organizations(name)")
    .eq("user_id", user.id);

  console.log("\n✅ Email confirmed.");
  console.log(`Memberships (${memberships?.length ?? 0}):`);
  for (const m of memberships ?? []) {
    const orgs = m.organizations as unknown;
    let orgName = "?";
    if (Array.isArray(orgs)) {
      orgName = (orgs[0] as { name?: string } | undefined)?.name ?? "?";
    } else if (orgs && typeof orgs === "object") {
      orgName = (orgs as { name?: string }).name ?? "?";
    }
    console.log(`  - ${m.role} of "${orgName}"`);
  }
  if (!memberships || memberships.length === 0) {
    console.warn("\n⚠️  No organization_members row — the signup trigger may have failed.");
    console.warn("    Login will redirect to /login?error=no_org. Will repair on next signup.");
  }
}

main().catch((err) => {
  console.error("Unexpected:", err);
  process.exit(1);
});
