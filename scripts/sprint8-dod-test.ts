/**
 * Sprint 8 — DoD: LGPD compliance (export + delete cascade).
 *
 * Fluxo:
 *   1. Camila (owner) cria org, cliente, projeto, doc, scope_change, notification
 *   2. Export: simula exportUserDataAsJson — verifica que vem TUDO
 *   3. Delete: simula deleteUserAccount → org deletada em cascata
 *   4. Bruno (membro de outra org da Camila) — testa "remove só membership"
 *   5. Verifica que clients/projects/documents/etc da Camila não existem mais
 *   6. Verifica que orgs onde Camila era membro continuam (mas sem ela)
 *
 * Run with: npx tsx scripts/sprint8-dod-test.ts
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

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const admin = createClient(URL, SERVICE, {
  auth: { autoRefreshToken: false, persistSession: false },
});

let failures = 0;
function assert(cond: boolean, msg: string) {
  if (cond) console.log(`  ✅ ${msg}`);
  else {
    console.error(`  ❌ ${msg}`);
    failures += 1;
  }
}

const stamp = Date.now();

async function createUser(email: string, orgName: string): Promise<string> {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: "TestS8Password123!",
    email_confirm: true,
    user_metadata: { org_name: orgName },
  });
  if (error || !data.user) throw new Error(error?.message);
  return data.user.id;
}

async function main() {
  console.log("\n🔬 Sprint 8 — DoD: LGPD export + delete cascade\n");
  let camilaId: string | null = null;
  let brunoId: string | null = null;

  try {
    console.log("Step 1: Setup Camila + Bruno");
    camilaId = await createUser(`camila.s8.${stamp}@example.com`, `OrgCamila-S8-${stamp}`);
    brunoId = await createUser(`bruno.s8.${stamp}@example.com`, `OrgBruno-S8-${stamp}`);

    const { data: camilaMember } = await admin
      .from("organization_members")
      .select("org_id")
      .eq("user_id", camilaId)
      .single();
    const camilaOrg = camilaMember!.org_id as string;

    const { data: brunoMember } = await admin
      .from("organization_members")
      .select("org_id")
      .eq("user_id", brunoId)
      .single();
    const brunoOrg = brunoMember!.org_id as string;

    console.log("\nStep 2: Camila cria dados completos na sua org");
    const { data: client } = await admin
      .from("clients")
      .insert({ org_id: camilaOrg, nome: "Cliente LGPD Test", email: "cliente@s8.com" })
      .select("id")
      .single();
    const { data: project } = await admin
      .from("projects")
      .insert({
        org_id: camilaOrg,
        client_id: client!.id,
        nome: "Projeto LGPD",
        tipologia: "residencial",
        area_prevista_m2: 100,
      })
      .select("id")
      .single();
    await admin.from("documents").insert({
      project_id: project!.id,
      tipo: "memorial",
      versao: 1,
      titulo: "Memorial LGPD",
      conteudo_tiptap: { type: "doc", content: [] },
    });
    await admin.from("scope_changes").insert({
      project_id: project!.id,
      solicitado_por: "cliente",
      descricao: "Alterar piso",
      status: "pendente_analise",
    });
    await admin.from("notifications").insert({
      org_id: camilaOrg,
      type: "plan.upgraded",
      title: "Test notification",
    });
    await admin.from("audit_log").insert({
      org_id: camilaOrg,
      actor_type: "user",
      action: "test.action",
      entity_type: "test",
    });
    console.log(`     org=${camilaOrg.slice(0, 8)} project=${project!.id.slice(0, 8)}`);

    console.log("\nStep 3: Camila convida Bruno como member na sua org");
    await admin.from("organization_members").insert({
      org_id: brunoOrg,
      user_id: camilaId,
      role: "member",
      accepted_at: new Date().toISOString(),
    });
    const { data: camilaMemberships } = await admin
      .from("organization_members")
      .select("org_id, role")
      .eq("user_id", camilaId);
    assert(
      (camilaMemberships?.length ?? 0) === 2,
      `Camila agora em 2 orgs (viu ${camilaMemberships?.length ?? 0})`,
    );
    const owners = camilaMemberships?.filter((m) => m.role === "owner") ?? [];
    const members = camilaMemberships?.filter((m) => m.role === "member") ?? [];
    assert(owners.length === 1, "Camila é owner de 1 org");
    assert(members.length === 1, "Camila é member de 1 outra org");

    console.log("\nStep 4: 📥 Export — exportUserDataAsJson devolve dados completos");
    // Reproduz a query do service (que importa server-only)
    const [orgRow, clientsRow, projectsRow, docsRow, scsRow, notifRow, auditRow] =
      await Promise.all([
        admin.from("organizations").select("*").eq("id", camilaOrg).single(),
        admin.from("clients").select("*").eq("org_id", camilaOrg),
        admin.from("projects").select("*").eq("org_id", camilaOrg),
        admin
          .from("documents")
          .select("*, projects!inner(org_id)")
          .eq("projects.org_id", camilaOrg),
        admin
          .from("scope_changes")
          .select("*, projects!inner(org_id)")
          .eq("projects.org_id", camilaOrg),
        admin.from("notifications").select("*").eq("org_id", camilaOrg),
        admin.from("audit_log").select("*").eq("org_id", camilaOrg),
      ]);

    assert(!!orgRow.data?.id, "Export inclui organization");
    assert((clientsRow.data?.length ?? 0) === 1, "Export inclui 1 client");
    assert((projectsRow.data?.length ?? 0) === 1, "Export inclui 1 project");
    assert((docsRow.data?.length ?? 0) === 1, "Export inclui 1 document");
    assert((scsRow.data?.length ?? 0) === 1, "Export inclui 1 scope_change");
    assert((notifRow.data?.length ?? 0) >= 1, "Export inclui notifications");
    assert((auditRow.data?.length ?? 0) >= 1, "Export inclui audit_log");

    console.log("\nStep 5: 🗑️ Delete account — simula deleteUserAccount(camilaId)");
    // Camila é owner do camilaOrg e member do brunoOrg
    // 1. Deleta org onde é owner
    const { error: orgDelErr } = await admin.from("organizations").delete().eq("id", camilaOrg);
    assert(!orgDelErr, "Org da Camila (owner) deletada");

    // 2. Remove membership de orgs onde é só member
    const { error: memDelErr } = await admin
      .from("organization_members")
      .delete()
      .eq("user_id", camilaId)
      .eq("org_id", brunoOrg);
    assert(!memDelErr, "Membership removida da org do Bruno");

    // 3. Deleta auth user
    const { error: authDelErr } = await admin.auth.admin.deleteUser(camilaId);
    assert(!authDelErr, "Auth user da Camila deletado");
    camilaId = null; // não tentar deletar de novo no cleanup

    console.log("\nStep 6: 🧹 Cascade verificado — clients/projects/docs/etc apagados");
    const checks = await Promise.all([
      admin.from("clients").select("id").eq("id", client!.id).maybeSingle(),
      admin.from("projects").select("id").eq("id", project!.id).maybeSingle(),
      admin
        .from("documents")
        .select("id, projects!inner(id)")
        .eq("projects.id", project!.id)
        .maybeSingle(),
      admin
        .from("scope_changes")
        .select("id, projects!inner(id)")
        .eq("projects.id", project!.id)
        .maybeSingle(),
      admin.from("notifications").select("id").eq("org_id", camilaOrg).maybeSingle(),
      admin.from("organizations").select("id").eq("id", camilaOrg).maybeSingle(),
    ]);
    assert(!checks[0].data, "Client deletado via cascade");
    assert(!checks[1].data, "Project deletado via cascade");
    assert(!checks[2].data, "Document deletado via cascade");
    assert(!checks[3].data, "Scope change deletado via cascade");
    assert(!checks[4].data, "Notifications deletadas via cascade");
    assert(!checks[5].data, "Organization removida");

    console.log("\nStep 7: 🛡️ Org do Bruno preservada (Camila era só member)");
    const { data: brunoOrgAfter } = await admin
      .from("organizations")
      .select("id")
      .eq("id", brunoOrg)
      .maybeSingle();
    assert(!!brunoOrgAfter, "Org do Bruno ainda existe");

    const { data: brunoMembersAfter } = await admin
      .from("organization_members")
      .select("user_id")
      .eq("org_id", brunoOrg);
    assert(
      (brunoMembersAfter?.length ?? 0) === 1,
      `Org do Bruno tem só Bruno agora (viu ${brunoMembersAfter?.length ?? 0})`,
    );
    assert(brunoMembersAfter?.[0]?.user_id === brunoId, "Único membro restante é o Bruno");

    console.log("\nStep 8: 🛡️ Auth user da Camila não existe mais");
    const { data: authCheck } = await admin.auth.admin.listUsers();
    const camilaStillExists = authCheck.users.some((u) => u.email?.includes(`camila.s8.${stamp}`));
    assert(!camilaStillExists, "Auth user da Camila removido");
  } finally {
    console.log("\nCleanup…");
    if (camilaId) await admin.auth.admin.deleteUser(camilaId).catch(() => {});
    if (brunoId) await admin.auth.admin.deleteUser(brunoId).catch(() => {});
    console.log("  Done.");
  }

  console.log(
    `\n${failures === 0 ? "✅ Sprint 8 DoD PASSED" : `❌ Sprint 8 DoD FAILED (${failures})`}\n`,
  );
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error("\n💥", err);
  process.exit(1);
});
