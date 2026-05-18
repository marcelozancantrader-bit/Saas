/**
 * Sprint 5 — DoD: Geração de Documentos por IA.
 *
 * Camila cria projeto com extração confirmada → gera 4 documentos em sequência
 * (memorial, caderno, proposta, contrato) → valida:
 *   - Cada doc tem titulo + seções com headings + parágrafos
 *   - prompt_versao registrado
 *   - Latência total < 15min (critério spec; com Sonnet 4.6 fica ~30-60s por doc)
 *   - RLS: Bruno (outra org) não vê os documentos
 *
 * Run with: npx tsx scripts/sprint5-dod-test.ts
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
const ANTHROPIC = process.env.ANTHROPIC_API_KEY;

if (!ANTHROPIC) {
  console.error("ANTHROPIC_API_KEY missing — skipping live test");
  process.exit(2);
}

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
  email: `camila.s5.${stamp}@example.com`,
  password: "TestS5Camila123!",
  org_name: `OrgCamila-S5-${stamp}`,
};
const BRUNO = {
  email: `bruno.s5.${stamp}@example.com`,
  password: "TestS5Bruno123!",
  org_name: `OrgBruno-S5-${stamp}`,
};

async function createUser(fx: typeof CAMILA): Promise<string> {
  const { data, error } = await admin.auth.admin.createUser({
    email: fx.email,
    password: fx.password,
    email_confirm: true,
    user_metadata: { org_name: fx.org_name },
  });
  if (error || !data.user) throw new Error(error?.message);
  return data.user.id;
}

async function signIn(fx: typeof CAMILA): Promise<SupabaseClient> {
  const c = createClient(URL, ANON, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { error } = await c.auth.signInWithPassword({ email: fx.email, password: fx.password });
  if (error) throw new Error(error.message);
  return c;
}

async function orgIdOf(c: SupabaseClient): Promise<string> {
  const { data } = await c.from("organization_members").select("org_id").limit(1);
  return data![0]!.org_id as string;
}

function fakeMeta() {
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
        { nome: "Suíte", area_m2: 16, tipo: "suite" },
        { nome: "Banheiro social", area_m2: 4.5, tipo: "banheiro" },
        { nome: "Banheiro suíte", area_m2: 5, tipo: "banheiro" },
        { nome: "Área de serviço", area_m2: 5, tipo: "area_servico" },
        { nome: "Garagem", area_m2: 16, tipo: "garagem" },
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
  console.log("\n🔬 Sprint 5 — DoD test: Geração de documentos por IA\n");

  const userIds: string[] = [];

  try {
    console.log("Step 1: Setup Camila + Bruno");
    const camilaId = await createUser(CAMILA);
    const brunoId = await createUser(BRUNO);
    userIds.push(camilaId, brunoId);
    const camila = await signIn(CAMILA);
    const bruno = await signIn(BRUNO);
    const camilaOrg = await orgIdOf(camila);

    console.log("\nStep 2: Camila cria projeto + extracao confirmada");
    const { data: client } = await camila
      .from("clients")
      .insert({ org_id: camilaOrg, nome: "Cliente Memorial Test", email: "cliente@test.com" })
      .select("id")
      .single();
    const { data: project } = await camila
      .from("projects")
      .insert({
        org_id: camilaOrg,
        client_id: client!.id,
        nome: "Casa Test Sprint 5 120m²",
        tipologia: "residencial",
        padrao_construtivo: "medio",
        area_prevista_m2: 120,
        meta: fakeMeta(),
      })
      .select("id")
      .single();
    console.log(`     projeto: ${project!.id.slice(0, 8)}`);

    console.log("\nStep 3: 🤖 Gerar 4 documentos via Claude Sonnet 4.6");
    const { generateDocument } = await import("../lib/ai/generate-document.js");
    const { documentToTiptap, tiptapToBlocks } = await import("../lib/tiptap/from-sections.js");

    const tipos = ["memorial", "caderno", "proposta", "contrato"] as const;
    let totalCost = 0;
    let totalMs = 0;

    for (const tipo of tipos) {
      const t0 = Date.now();
      const result = await generateDocument(
        {
          tipo,
          context: {
            project: {
              nome: "Casa Test Sprint 5 120m²",
              tipologia: "residencial",
              area_prevista_m2: 120,
              padrao_construtivo: "medio",
              endereco_completo: "Rua Teste, 123 — Curitiba/PR",
            },
            client: {
              nome: "Cliente Memorial Test",
              cpf_cnpj: "123.456.789-00",
              email: "cliente@test.com",
            },
            extracao_planta: fakeMeta().extracao_planta as unknown as Parameters<
              typeof generateDocument
            >[0]["context"]["extracao_planta"],
          },
        },
        { timeoutMs: 290_000 },
      );
      const elapsedMs = Date.now() - t0;
      totalMs += elapsedMs;

      if (!result.ok) {
        console.error(`  ❌ ${tipo}: ${result.error}${result.detail ? ` — ${result.detail}` : ""}`);
        failures += 1;
        continue;
      }
      totalCost += result.usage.usd_cost;

      console.log(
        `  ✅ ${tipo}: "${result.document.titulo}" — ${result.document.sections.length} seções, ${(elapsedMs / 1000).toFixed(1)}s, $${result.usage.usd_cost.toFixed(4)}`,
      );

      assert(result.document.titulo.length > 0, `${tipo}: tem título`);
      assert(result.document.sections.length >= 3, `${tipo}: ao menos 3 seções`);

      // Verify Tiptap conversion
      const tiptap = documentToTiptap(result.document);
      assert(tiptap.type === "doc", `${tipo}: Tiptap doc bem-formado`);
      const blocks = tiptapToBlocks(tiptap);
      assert(blocks.length > 0, `${tipo}: blocos extraídos para PDF`);

      // Save to DB
      const { data: inserted, error: dbErr } = await camila
        .from("documents")
        .insert({
          project_id: project!.id,
          tipo,
          versao: 1,
          titulo: result.document.titulo,
          conteudo_tiptap: tiptap,
          status: "rascunho",
          prompt_versao: result.promptVersion,
          custo_tokens: result.usage,
        })
        .select("id")
        .single();
      assert(!dbErr && !!inserted, `${tipo}: salvou no banco`);
    }

    console.log(
      `\nTotal: ${(totalMs / 1000).toFixed(1)}s para 4 documentos, custo $${totalCost.toFixed(4)}`,
    );
    assert(totalMs < 15 * 60 * 1000, `4 documentos em <15min (alvo do spec)`);

    console.log("\nStep 4: 🎯 RLS — Bruno não vê documentos do projeto da Camila");
    const { data: brunoDocs } = await bruno
      .from("documents")
      .select("id, tipo")
      .eq("project_id", project!.id);
    assert(
      !brunoDocs || brunoDocs.length === 0,
      `Bruno cannot see Camila's documents (saw ${brunoDocs?.length ?? 0})`,
    );

    console.log("\nStep 5: Camila vê os 4 documentos");
    const { data: camilaDocs } = await camila
      .from("documents")
      .select("id, tipo, titulo, prompt_versao")
      .eq("project_id", project!.id);
    assert(camilaDocs?.length === 4, `Camila vê 4 documentos (viu ${camilaDocs?.length ?? 0})`);
    const tiposSalvos = new Set((camilaDocs ?? []).map((d) => d.tipo));
    assert(
      tiposSalvos.has("memorial") &&
        tiposSalvos.has("caderno") &&
        tiposSalvos.has("proposta") &&
        tiposSalvos.has("contrato"),
      "Os 4 tipos foram persistidos",
    );
  } finally {
    console.log("\nCleanup…");
    for (const id of userIds) {
      await admin.auth.admin.deleteUser(id).catch(() => {});
    }
    console.log("  Done.");
  }

  console.log(
    `\n${failures === 0 ? "✅ Sprint 5 DoD PASSED" : `❌ Sprint 5 DoD FAILED (${failures})`}\n`,
  );
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error("\n💥", err);
  process.exit(1);
});
