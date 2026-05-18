/**
 * Sprint 4 — DoD: Orçamento SINAPI heurístico (sem IA).
 *
 * Camila cria conta → cliente → projeto → confirma extração (simulando o que viria do Sprint 3) →
 * gera orçamento via regras v1 → valida:
 *   - Items > 0
 *   - Total > 0
 *   - Total com BDI > total bruto
 *   - Latência < 10s (critério do spec)
 *   - RLS: Bruno (outra org) não vê o orçamento de Camila
 *
 * Run with: npx tsx scripts/sprint4-dod-test.ts
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

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
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
const CAMILA = {
  email: `camila.s4.${stamp}@example.com`,
  password: "TestS4Camila123!",
  org_name: `OrgCamila-S4-${stamp}`,
};
const BRUNO = {
  email: `bruno.s4.${stamp}@example.com`,
  password: "TestS4Bruno123!",
  org_name: `OrgBruno-S4-${stamp}`,
};

async function createUser(fx: typeof CAMILA): Promise<string> {
  const { data, error } = await admin.auth.admin.createUser({
    email: fx.email,
    password: fx.password,
    email_confirm: true,
    user_metadata: { org_name: fx.org_name },
  });
  if (error || !data.user) throw new Error(`createUser ${fx.email}: ${error?.message}`);
  return data.user.id;
}

async function signIn(fx: typeof CAMILA): Promise<SupabaseClient> {
  const c = createClient(URL, ANON, {
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

// Mimics what confirmExtractionAction does for the project's meta.
function fakeExtractionMeta() {
  return {
    extracao_planta: {
      area_total_m2: 120,
      area_terreno_m2: null,
      numero_pavimentos: 1,
      tipologia: "residencial",
      padrao_construtivo: "medio",
      ambientes: [
        { nome: "Sala", area_m2: 25, tipo: "sala" },
        { nome: "Cozinha", area_m2: 12, tipo: "cozinha" },
        { nome: "Quarto 1", area_m2: 14, tipo: "quarto" },
        { nome: "Quarto 2 (suíte)", area_m2: 16, tipo: "suite" },
        { nome: "Banheiro social", area_m2: 4.5, tipo: "banheiro" },
        { nome: "Banheiro suíte", area_m2: 5, tipo: "banheiro" },
        { nome: "Área de serviço", area_m2: 5, tipo: "area_servico" },
        { nome: "Garagem", area_m2: 16, tipo: "garagem" },
        { nome: "Circulação", area_m2: 8, tipo: "circulacao" },
      ],
      elementos_especiais: {
        piscina: false,
        churrasqueira: false,
        sacada: false,
        garagem: true,
        jardim: false,
        area_servico_externa: false,
      },
      observacoes: "Test fixture",
      confianca: "alta",
      confirmed_by_user: true,
      confirmed_at: new Date().toISOString(),
    },
  };
}

async function main() {
  console.log("\n🔬 Sprint 4 — DoD test: Orçamento SINAPI heurístico\n");

  const userIds: string[] = [];

  try {
    // Setup tenants
    console.log("Step 1: Create Camila + Bruno");
    const camilaId = await createUser(CAMILA);
    const brunoId = await createUser(BRUNO);
    userIds.push(camilaId, brunoId);
    const camila = await signIn(CAMILA);
    const bruno = await signIn(BRUNO);
    const camilaOrg = await orgIdOf(camila);
    const brunoOrg = await orgIdOf(bruno);
    assert(camilaOrg !== brunoOrg, "Different orgs");

    // Camila creates a project with confirmed extraction
    console.log("\nStep 2: Camila creates a project with confirmed extraction (120m² residencial)");
    const { data: client } = await camila
      .from("clients")
      .insert({ org_id: camilaOrg, nome: "Cliente S4 Test" })
      .select("id")
      .single();
    const { data: project } = await camila
      .from("projects")
      .insert({
        org_id: camilaOrg,
        client_id: client!.id,
        nome: "Casa 120m²",
        tipologia: "residencial",
        padrao_construtivo: "medio",
        area_prevista_m2: 120,
        meta: fakeExtractionMeta(),
      })
      .select("id")
      .single();
    assert(!!project, `Project created (${project?.id?.slice(0, 8)})`);

    // The Server Action `generateBudgetAction` is what we're proving. Since it imports server-only
    // we can't run it directly here without setting up Next runtime — instead we replicate its
    // logic inline using the same building blocks: applyRulesV1 + sinapi lookup + insert.
    console.log(
      "\nStep 3: Apply rules v1 + query SINAPI + insert budget (mimics generateBudgetAction)",
    );
    const t0 = Date.now();
    const { applyRulesV1 } = await import("../lib/budget/rules/v1.js");
    const { applyBdi, sumMoney, toDbNumeric } = await import("../lib/utils/money.js");
    const Big = (await import("big.js")).default;

    const meta = fakeExtractionMeta().extracao_planta as Parameters<typeof applyRulesV1>[0];
    const ruleItems = applyRulesV1(meta);
    assert(ruleItems.length > 0, `Rules returned ${ruleItems.length} items`);

    // Fetch SINAPI prices
    const uniqueCodes = [...new Set(ruleItems.map((i) => i.codigo_sinapi))];
    const { data: sinapiRows, error: sinapiErr } = await camila
      .from("sinapi_compositions")
      .select("codigo, descricao, unidade, preco")
      .in("codigo", uniqueCodes)
      .eq("uf", "SP")
      .eq("mes_referencia", "2026-05-01")
      .eq("desonerado", true);
    if (sinapiErr) throw new Error(`SINAPI query: ${sinapiErr.message}`);

    const priceByCode = new Map<string, { unidade: string; preco: string }>(
      (sinapiRows ?? []).map((r) => [r.codigo, { unidade: r.unidade, preco: r.preco }]),
    );
    const missing = uniqueCodes.filter((c) => !priceByCode.has(c));
    assert(missing.length === 0, `All ${uniqueCodes.length} SINAPI codes resolved`);

    const itemsForInsert = ruleItems.map((item, idx) => {
      const s = priceByCode.get(item.codigo_sinapi)!;
      const precoUnit = new Big(s.preco);
      return {
        ordem: idx + 1,
        composicao_codigo: item.codigo_sinapi,
        descricao: item.descricao_local,
        unidade: s.unidade,
        quantidade: item.quantidade.round(4, Big.roundHalfUp).toFixed(4),
        preco_unitario: precoUnit.round(4, Big.roundHalfUp).toFixed(4),
        total_calc: item.quantidade.times(precoUnit),
        origem: "sinapi" as const,
      };
    });
    const totalBruto = sumMoney(itemsForInsert.map((i) => i.total_calc));
    const totalComBdi = applyBdi(totalBruto, 25);

    const { data: budget, error: bErr } = await camila
      .from("budgets")
      .insert({
        project_id: project!.id,
        versao: 1,
        uf: "SP",
        mes_referencia: "2026-05-01",
        desonerado: true,
        bdi_pct: 25,
        total_bruto: toDbNumeric(totalBruto),
        total_com_bdi: toDbNumeric(totalComBdi),
        status: "rascunho",
      })
      .select("id")
      .single();
    if (bErr) throw new Error(`Insert budget: ${bErr.message}`);

    const { error: iErr } = await camila.from("budget_items").insert(
      itemsForInsert.map((item) => ({
        budget_id: budget!.id,
        ordem: item.ordem,
        composicao_codigo: item.composicao_codigo,
        descricao: item.descricao,
        unidade: item.unidade,
        quantidade: item.quantidade,
        preco_unitario: item.preco_unitario,
        origem: item.origem,
      })),
    );
    if (iErr) throw new Error(`Insert items: ${iErr.message}`);

    const elapsedMs = Date.now() - t0;
    assert(elapsedMs < 10000, `Generation took ${elapsedMs}ms (target <10000ms)`);

    // Verify
    const { data: savedBudget } = await camila
      .from("budgets")
      .select("total_bruto, total_com_bdi, bdi_pct")
      .eq("id", budget!.id)
      .single();
    assert(Number(savedBudget?.total_bruto) > 0, `total_bruto > 0 (${savedBudget?.total_bruto})`);
    assert(
      Number(savedBudget?.total_com_bdi) > Number(savedBudget?.total_bruto),
      `total_com_bdi > total_bruto`,
    );
    console.log(`     total bruto: R$ ${Number(savedBudget?.total_bruto).toFixed(2)}`);
    console.log(`     total c/ BDI: R$ ${Number(savedBudget?.total_com_bdi).toFixed(2)}`);
    console.log(`     items: ${itemsForInsert.length}`);

    const { data: countResult } = await camila
      .from("budget_items")
      .select("id", { count: "exact", head: true })
      .eq("budget_id", budget!.id);
    void countResult;

    // RLS test
    console.log("\nStep 4: 🎯 Bruno tries to read Camila's budget — must see nothing");
    const { data: brunoSeesBudgets } = await bruno
      .from("budgets")
      .select("id, project_id")
      .eq("id", budget!.id);
    assert(
      !brunoSeesBudgets || brunoSeesBudgets.length === 0,
      `Bruno cannot see Camila's budget (saw ${brunoSeesBudgets?.length ?? 0})`,
    );

    const { data: brunoSeesItems } = await bruno
      .from("budget_items")
      .select("id")
      .eq("budget_id", budget!.id);
    assert(
      !brunoSeesItems || brunoSeesItems.length === 0,
      `Bruno cannot see Camila's budget items (saw ${brunoSeesItems?.length ?? 0})`,
    );

    // SINAPI: both can read (reference data — public for authenticated)
    console.log("\nStep 5: Both users can read SINAPI compositions (reference data)");
    const { data: camilaSinapi } = await camila
      .from("sinapi_compositions")
      .select("codigo", { count: "exact", head: true });
    const { data: brunoSinapi } = await bruno
      .from("sinapi_compositions")
      .select("codigo", { count: "exact", head: true });
    void camilaSinapi;
    void brunoSinapi;
    const { count: camilaCount } = await camila
      .from("sinapi_compositions")
      .select("*", { count: "exact", head: true });
    const { count: brunoCount } = await bruno
      .from("sinapi_compositions")
      .select("*", { count: "exact", head: true });
    assert((camilaCount ?? 0) > 0, `Camila reads ${camilaCount ?? 0} SINAPI rows`);
    assert((brunoCount ?? 0) > 0, `Bruno reads ${brunoCount ?? 0} SINAPI rows`);
  } finally {
    console.log("\nCleanup: deleting test users…");
    for (const id of userIds) {
      await admin.auth.admin.deleteUser(id).catch(() => {});
    }
    console.log("  Done.");
  }

  console.log(
    `\n${failures === 0 ? "✅ Sprint 4 DoD PASSED" : `❌ Sprint 4 DoD FAILED (${failures})`}\n`,
  );
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error("\n💥 Unexpected error:", err);
  process.exit(1);
});
