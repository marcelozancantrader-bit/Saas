/**
 * Sprint 1 — Definition of Done: RLS cross-tenant test.
 *
 * Programatically validates that two users in different organizations
 * cannot see each other's data. Mirrors the manual two-browser test
 * from the plan, but runs end-to-end without UI.
 *
 * Run with: `npx tsx scripts/sprint1-dod-test.ts`
 *
 * Requires .env.local with:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// ----- Load .env.local manually (no dotenv dependency) ----------
function loadEnv() {
  const envPath = resolve(process.cwd(), ".env.local");
  const text = readFileSync(envPath, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
    if (m && !process.env[m[1]!]) {
      process.env[m[1]!] = m[2];
    }
  }
}
loadEnv();

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!URL || !ANON || !SERVICE) {
  console.error("Missing required env vars in .env.local");
  process.exit(1);
}

const admin = createClient(URL, SERVICE, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Two test fixtures — unique per run to avoid collisions
const stamp = Date.now();
const CAMILA = {
  email: `camila.dod.${stamp}@example.com`,
  password: "TestPasswordCamila123!",
  org_name: `OrgCamilaTeste-${stamp}`,
  full_name: "Camila DoD Test",
};
const BRUNO = {
  email: `bruno.dod.${stamp}@example.com`,
  password: "TestPasswordBruno123!",
  org_name: `OrgBrunoTeste-${stamp}`,
  full_name: "Bruno DoD Test",
};

type Fixture = typeof CAMILA;

// ----- Helpers ------------------------------------------------------
let failures = 0;
function assert(cond: boolean, msg: string) {
  if (cond) {
    console.log(`  ✅ ${msg}`);
  } else {
    console.error(`  ❌ ${msg}`);
    failures += 1;
  }
}

async function createUser(fixture: Fixture): Promise<string> {
  const { data, error } = await admin.auth.admin.createUser({
    email: fixture.email,
    password: fixture.password,
    email_confirm: true,
    user_metadata: {
      org_name: fixture.org_name,
      full_name: fixture.full_name,
      lgpd_consent_at: new Date().toISOString(),
    },
  });
  if (error || !data.user) throw new Error(`createUser ${fixture.email}: ${error?.message}`);
  return data.user.id;
}

async function signInClient(fixture: Fixture): Promise<SupabaseClient> {
  const client = createClient(URL!, ANON!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { error } = await client.auth.signInWithPassword({
    email: fixture.email,
    password: fixture.password,
  });
  if (error) throw new Error(`signIn ${fixture.email}: ${error.message}`);
  return client;
}

async function getOrgId(client: SupabaseClient): Promise<string> {
  const { data, error } = await client.from("organization_members").select("org_id").limit(1);
  if (error) throw new Error(`getOrgId: ${error.message}`);
  if (!data || data.length === 0) throw new Error("getOrgId: no membership row found");
  return data[0]!.org_id as string;
}

async function cleanup(userIds: string[]) {
  for (const id of userIds) {
    await admin.auth.admin.deleteUser(id).catch(() => {});
  }
}

// ----- Main ---------------------------------------------------------
async function main() {
  console.log("\n🔬 Sprint 1 — DoD test: RLS cross-tenant isolation\n");

  const userIds: string[] = [];

  try {
    // 1. Create both users — signup trigger should create org + membership atomically
    console.log("Step 1: Create Camila and Bruno via admin API");
    const camilaId = await createUser(CAMILA);
    const brunoId = await createUser(BRUNO);
    userIds.push(camilaId, brunoId);
    console.log(`  Camila: ${camilaId}`);
    console.log(`  Bruno : ${brunoId}\n`);

    // 2. Confirm signup trigger fired — each user has an org + owner membership
    console.log("Step 2: Verify signup trigger created orgs + memberships");
    const { data: orgs } = await admin
      .from("organizations")
      .select("id, name")
      .in("name", [CAMILA.org_name, BRUNO.org_name]);
    assert(orgs?.length === 2, `Both organizations exist (found ${orgs?.length ?? 0}/2)`);

    const { data: memberships } = await admin
      .from("organization_members")
      .select("user_id, role")
      .in("user_id", [camilaId, brunoId]);
    assert(
      memberships?.length === 2 &&
        memberships.every((m) => (m as { role: string }).role === "owner"),
      "Both users are 'owner' of their org",
    );

    // 3. Sign in each user separately
    console.log("\nStep 3: Sign in both users via anon endpoint");
    const camilaClient = await signInClient(CAMILA);
    const brunoClient = await signInClient(BRUNO);
    console.log("  Both signed in successfully\n");

    const camilaOrgId = await getOrgId(camilaClient);
    const brunoOrgId = await getOrgId(brunoClient);
    assert(camilaOrgId !== brunoOrgId, "Camila and Bruno have different org_ids");

    // 4. As Camila, insert a client — should succeed via clients_insert_if_member policy
    console.log("\nStep 4: Camila inserts a client");
    const { error: insertError } = await camilaClient.from("clients").insert({
      org_id: camilaOrgId,
      nome: "Cliente Teste Camila",
    });
    assert(!insertError, `Insert succeeded (${insertError?.message ?? "ok"})`);

    // 5. THE DoD: As Bruno, list clients — must return 0 rows
    console.log("\nStep 5: 🎯 THE DoD — Bruno selects from clients");
    const { data: brunoSeesClients, error: brunoError } = await brunoClient
      .from("clients")
      .select("id, nome, org_id");
    assert(!brunoError, "Query did not error");
    assert(
      brunoSeesClients?.length === 0,
      `Bruno sees 0 clients (saw ${brunoSeesClients?.length ?? "?"})`,
    );

    // 6. As Camila, list clients — must see 1 row
    console.log("\nStep 6: Camila selects from clients (should see her own)");
    const { data: camilaSeesClients } = await camilaClient
      .from("clients")
      .select("id, nome, org_id");
    assert(
      camilaSeesClients?.length === 1,
      `Camila sees 1 client (saw ${camilaSeesClients?.length ?? "?"})`,
    );

    // 7. Bruno reads organizations — should see only his org
    console.log("\nStep 7: Bruno selects from organizations");
    const { data: brunoSeesOrgs } = await brunoClient.from("organizations").select("id, name");
    assert(
      brunoSeesOrgs?.length === 1 && brunoSeesOrgs[0]!.name === BRUNO.org_name,
      "Bruno sees only his own org",
    );

    // 8. Bruno tries to insert a client in Camila's org — should fail RLS check
    console.log("\nStep 8: Bruno tries to insert a client INTO Camila's org (should fail)");
    const { error: crossError } = await brunoClient.from("clients").insert({
      org_id: camilaOrgId,
      nome: "Hack attempt",
    });
    assert(
      !!crossError,
      `Cross-tenant insert blocked (${crossError?.message ?? "NO ERROR — RLS LEAK!"})`,
    );
  } finally {
    console.log("\nCleanup: deleting test users…");
    await cleanup(userIds);
    console.log("  Done.");
  }

  console.log(
    `\n${failures === 0 ? "✅ DoD PASSED" : `❌ DoD FAILED (${failures} assertion(s))`}\n`,
  );
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error("\n💥 Unexpected error:", err);
  process.exit(1);
});
