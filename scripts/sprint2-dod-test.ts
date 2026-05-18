/**
 * Sprint 2 — Definition of Done: RLS isolation on projects + project_files + storage.
 *
 * Camila and Bruno each create:
 *   - a client
 *   - a project linked to that client
 *   - upload a fake "planta" file to project-files storage
 *
 * Then we assert:
 *   - Bruno cannot see Camila's projects, project_files, or storage objects (and vice-versa)
 *   - Bruno cannot insert into Camila's project (cross-tenant write blocked)
 *
 * Run with: `npx tsx scripts/sprint2-dod-test.ts`
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
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

const stamp = Date.now();
const CAMILA = {
  email: `camila.s2.${stamp}@example.com`,
  password: "TestPasswordCamila123!",
  org_name: `OrgCamila-S2-${stamp}`,
};
const BRUNO = {
  email: `bruno.s2.${stamp}@example.com`,
  password: "TestPasswordBruno123!",
  org_name: `OrgBruno-S2-${stamp}`,
};

type Fixture = typeof CAMILA;

let failures = 0;
function assert(cond: boolean, msg: string) {
  if (cond) console.log(`  ✅ ${msg}`);
  else {
    console.error(`  ❌ ${msg}`);
    failures += 1;
  }
}

async function createUser(fx: Fixture): Promise<string> {
  const { data, error } = await admin.auth.admin.createUser({
    email: fx.email,
    password: fx.password,
    email_confirm: true,
    user_metadata: { org_name: fx.org_name },
  });
  if (error || !data.user) throw new Error(`createUser ${fx.email}: ${error?.message}`);
  return data.user.id;
}

async function signIn(fx: Fixture): Promise<SupabaseClient> {
  const c = createClient(URL!, ANON!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { error } = await c.auth.signInWithPassword({ email: fx.email, password: fx.password });
  if (error) throw new Error(`signIn ${fx.email}: ${error.message}`);
  return c;
}

async function orgIdOf(c: SupabaseClient): Promise<string> {
  const { data } = await c.from("organization_members").select("org_id").limit(1);
  return data![0]!.org_id as string;
}

async function setupTenant(c: SupabaseClient, orgId: string, label: string) {
  const { data: client } = await c
    .from("clients")
    .insert({ org_id: orgId, nome: `Cliente ${label}` })
    .select("id")
    .single();
  const clientId = client!.id as string;

  const { data: project } = await c
    .from("projects")
    .insert({
      org_id: orgId,
      client_id: clientId,
      nome: `Projeto ${label}`,
      tipologia: "residencial",
    })
    .select("id")
    .single();
  const projectId = project!.id as string;

  // Upload a tiny "planta" file to Storage
  const path = `${orgId}/${projectId}/planta-${label}.pdf`;
  const body = new Blob([`%PDF-1.4 fake planta de ${label} %%EOF`], { type: "application/pdf" });
  const { error: storageError } = await c.storage.from("project-files").upload(path, body);
  if (storageError) throw new Error(`storage upload ${label}: ${storageError.message}`);

  const { data: fileRow } = await c
    .from("project_files")
    .insert({
      project_id: projectId,
      tipo: "planta_pdf",
      nome_original: `planta-${label}.pdf`,
      storage_path: path,
      mime_type: "application/pdf",
      tamanho_bytes: body.size,
    })
    .select("id")
    .single();

  return { clientId, projectId, fileId: fileRow!.id as string, storagePath: path };
}

async function cleanupStorage(c: SupabaseClient, paths: string[]) {
  if (paths.length > 0) {
    await c.storage
      .from("project-files")
      .remove(paths)
      .catch(() => {});
  }
}

async function main() {
  console.log("\n🔬 Sprint 2 — DoD test: projects + project_files + storage RLS\n");

  const userIds: string[] = [];
  const storagePaths: string[] = [];

  try {
    console.log("Step 1: Create Camila and Bruno via admin API");
    const camilaId = await createUser(CAMILA);
    const brunoId = await createUser(BRUNO);
    userIds.push(camilaId, brunoId);
    console.log(`  Camila: ${camilaId} | Bruno: ${brunoId}\n`);

    console.log("Step 2: Sign in both");
    const camila = await signIn(CAMILA);
    const bruno = await signIn(BRUNO);
    const camilaOrg = await orgIdOf(camila);
    const brunoOrg = await orgIdOf(bruno);
    assert(camilaOrg !== brunoOrg, "Camila and Bruno in different orgs");

    console.log("\nStep 3: Each tenant creates a client + project + uploads a planta PDF");
    const camilaData = await setupTenant(camila, camilaOrg, "Camila");
    storagePaths.push(camilaData.storagePath);
    console.log(`  Camila: project ${camilaData.projectId.slice(0, 8)} + file uploaded`);
    const brunoData = await setupTenant(bruno, brunoOrg, "Bruno");
    storagePaths.push(brunoData.storagePath);
    console.log(`  Bruno : project ${brunoData.projectId.slice(0, 8)} + file uploaded`);

    console.log("\nStep 4: 🎯 Bruno selects projects — must see only his own");
    const { data: brunoProjects } = await bruno.from("projects").select("id, nome, org_id");
    assert(
      brunoProjects?.length === 1 && brunoProjects[0]!.id === brunoData.projectId,
      `Bruno sees 1 project (his own) — saw ${brunoProjects?.length ?? "?"}`,
    );

    console.log("\nStep 5: 🎯 Bruno selects project_files — must see only his own");
    const { data: brunoFiles } = await bruno.from("project_files").select("id, project_id");
    assert(
      brunoFiles?.length === 1 && brunoFiles[0]!.id === brunoData.fileId,
      `Bruno sees 1 file (his own) — saw ${brunoFiles?.length ?? "?"}`,
    );

    console.log(
      "\nStep 6: 🎯 Bruno tries to LIST objects in Camila's storage prefix (must be blocked)",
    );
    const { data: brunoStorageList } = await bruno.storage
      .from("project-files")
      .list(`${camilaOrg}/${camilaData.projectId}`);
    assert(
      !brunoStorageList || brunoStorageList.length === 0,
      `Bruno cannot list Camila's storage prefix (got ${brunoStorageList?.length ?? 0} items)`,
    );

    console.log("\nStep 7: 🎯 Bruno tries to download Camila's planta directly (must be blocked)");
    const { data: stolen, error: dlError } = await bruno.storage
      .from("project-files")
      .download(camilaData.storagePath);
    assert(!stolen, `Bruno cannot download Camila's PDF (error: ${dlError?.message ?? "n/a"})`);

    console.log("\nStep 8: 🎯 Bruno tries to insert into Camila's project (cross-tenant write)");
    const { error: crossInsertError } = await bruno.from("project_files").insert({
      project_id: camilaData.projectId,
      tipo: "outro",
      nome_original: "hack.txt",
      storage_path: `${camilaOrg}/${camilaData.projectId}/hack.txt`,
      mime_type: "text/plain",
      tamanho_bytes: 10,
    });
    assert(
      !!crossInsertError,
      `Cross-tenant insert blocked (${crossInsertError?.message ?? "NO ERROR — RLS LEAK!"})`,
    );

    console.log("\nStep 9: Camila sees her own data unchanged");
    const { data: camilaProjects } = await camila.from("projects").select("id");
    assert(camilaProjects?.length === 1, "Camila sees 1 project");
    const { data: camilaFiles } = await camila.from("project_files").select("id");
    assert(camilaFiles?.length === 1, "Camila sees 1 file");
  } finally {
    console.log("\nCleanup: storage objects + users…");
    await cleanupStorage(admin, storagePaths);
    for (const id of userIds) {
      await admin.auth.admin.deleteUser(id).catch(() => {});
    }
    console.log("  Done.");
  }

  console.log(
    `\n${failures === 0 ? "✅ Sprint 2 DoD PASSED" : `❌ Sprint 2 DoD FAILED (${failures})`}\n`,
  );
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error("\n💥 Unexpected error:", err);
  process.exit(1);
});
