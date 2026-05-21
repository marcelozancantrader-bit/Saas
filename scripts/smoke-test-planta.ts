/**
 * Smoke test end-to-end de planta arquitetônica.
 * Roda: extração IA → plano diretor IA → zoneamento → NBR → orçamento + CUB.
 *
 * Uso: npx tsx scripts/smoke-test-planta.ts <caminho-pdf> <cidade> <UF>
 * Exemplo: npx tsx scripts/smoke-test-planta.ts "/c/Users/.../planta.pdf" Palmitinho RS
 */

import * as dotenv from "dotenv";
import { resolve } from "path";
import { readFileSync } from "fs";
import Big from "big.js";

dotenv.config({ path: resolve(process.cwd(), ".env.local"), override: true });

import { createClient } from "@supabase/supabase-js";
import { extractFloorPlanData } from "../lib/ai/extract-floor-plan";
import { fetchPlanoDirector } from "../lib/ai/fetch-plano-diretor";
import { runZoneamentoChecksCustom } from "../lib/zoneamento/check";
import { runNbrChecks } from "../lib/nbr-checks";
import { applyRulesV3, type ExtractedPlantaV3 } from "../lib/budget/rules/v3";

const PDF_PATH = process.argv[2] ?? "";
const CIDADE = process.argv[3] ?? "";
const UF = (process.argv[4] ?? "SP").toUpperCase();
const ORC_UF = UF;
const MES_REF = "2026-05-01";
const DESONERADO = true;
const BDI_PCT = 28;

if (!PDF_PATH || !CIDADE) {
  console.error(
    "Uso: npx tsx scripts/smoke-test-planta.ts <caminho-pdf> <cidade> <UF>\nEx.: npx tsx scripts/smoke-test-planta.ts ./planta.pdf Palmitinho RS",
  );
  process.exit(1);
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

function brl(v: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(v);
}

function divider(title: string) {
  console.log("\n" + "═".repeat(70));
  console.log(`  ${title}`);
  console.log("═".repeat(70));
}

async function main() {
  console.log(`\n📄 Arquivo: ${PDF_PATH}`);
  console.log(`📍 Cidade da obra: ${CIDADE}/${UF}`);
  console.log(`📅 Referência SINAPI: ${MES_REF} · ${DESONERADO ? "desonerado" : "não-desonerado"}`);

  const pdfBytes = readFileSync(PDF_PATH);
  console.log(`📦 Tamanho do PDF: ${(pdfBytes.length / 1024).toFixed(0)} KB`);

  // ============================================================
  // 1. EXTRAÇÃO IA DA PLANTA
  // ============================================================
  divider("1️⃣  EXTRAÇÃO IA DA PLANTA (Claude Sonnet 4.6)");
  console.log("⏳ Aguarde ~60s…");
  const t0 = Date.now();
  const ext = await extractFloorPlanData({ pdfBytes, filename: "planta.pdf" });
  const t1 = Date.now();
  if (!ext.ok) {
    console.error(`\n❌ FALHA: ${ext.error}`);
    if (ext.detail) console.error(`   Detail: ${ext.detail}`);
    process.exit(1);
  }
  console.log(
    `✅ Extração em ${((t1 - t0) / 1000).toFixed(1)}s — custo $${ext.usage.usd_cost.toFixed(4)}`,
  );
  console.log(`\nÁrea total: ${ext.data.area_total_m2 ?? "?"} m²`);
  console.log(`Pavimentos: ${ext.data.numero_pavimentos ?? "?"}`);
  console.log(`Tipologia: ${ext.data.tipologia}`);
  console.log(`Padrão construtivo: ${ext.data.padrao_construtivo ?? "?"}`);
  console.log(`Confiança IA: ${(ext.data as { confianca?: string }).confianca ?? "n/a"}`);
  console.log(`\nAmbientes (${ext.data.ambientes?.length ?? 0}):`);
  for (const a of ext.data.ambientes ?? []) {
    console.log(`  • ${a.nome} (${a.tipo ?? "?"}): ${a.area_m2 ?? "?"} m²`);
  }
  console.log(`\nElementos especiais:`);
  const ee = ext.data.elementos_especiais ?? {};
  console.log(
    `  piscina: ${ee.piscina ? "✓" : "—"} | churrasqueira: ${ee.churrasqueira ? "✓" : "—"} | sacada: ${ee.sacada ? "✓" : "—"} | garagem: ${ee.garagem ? "✓" : "—"} | jardim: ${ee.jardim ? "✓" : "—"}`,
  );

  // ============================================================
  // 2. PLANO DIRETOR IA
  // ============================================================
  divider(`2️⃣  PLANO DIRETOR — ${CIDADE}/${UF} (IA)`);
  console.log("⏳ Consultando Claude…");
  const t2 = Date.now();
  const pd = await fetchPlanoDirector({ cidade_nome: CIDADE, uf: UF });
  const t3 = Date.now();
  console.log(
    `✅ Plano em ${((t3 - t2) / 1000).toFixed(1)}s — custo $${pd._usage.usd_cost.toFixed(4)}`,
  );
  console.log(`\nZona: ${pd.zona_codigo} — ${pd.zona_label}`);
  console.log(`Lei: ${pd.lei}${pd.ano_lei ? ` (${pd.ano_lei})` : ""}`);
  console.log(`CA básico: ${pd.ca_basico} | CA máximo (c/ outorga): ${pd.ca_maximo}`);
  console.log(`Taxa de ocupação máx: ${pd.to_max_pct}%`);
  console.log(`Altura máx: ${pd.altura_max_m ?? "sem limite"}m`);
  console.log(
    `Recuos — frontal: ${pd.recuo_frontal_m ?? "—"}m | lateral: ${pd.recuo_lateral_m ?? "—"}m | fundos: ${pd.recuo_fundos_m ?? "—"}m`,
  );
  console.log(`Vagas: ${pd.vagas_por_unidade}/unidade`);
  console.log(`Permeabilidade mín: ${pd.permeabilidade_min_pct ?? "—"}%`);
  console.log(`Confiança IA: ${pd.confianca.toUpperCase()}`);
  if (pd.observacao) console.log(`⚠ Obs: ${pd.observacao}`);
  if (pd.fonte_url) console.log(`🔗 Fonte: ${pd.fonte_url}`);

  // ============================================================
  // 3. ZONEAMENTO — CHECKS
  // ============================================================
  divider("3️⃣  VALIDAÇÃO DE ZONEAMENTO");
  const areaTerreno = 360; // assumido (não vem da planta); user normalmente informa no form
  console.log(`(área do terreno assumida = ${areaTerreno}m² — ajuste manualmente no app)\n`);
  const zoneamentoFindings = runZoneamentoChecksCustom({
    rule: {
      zona: pd.zona_codigo,
      cidade_nome: pd.cidade_nome,
      uf: pd.uf,
      lei: pd.lei,
      origem: "ia",
      label: pd.zona_label,
      ca_basico: pd.ca_basico,
      ca_maximo: pd.ca_maximo,
      to_max_pct: pd.to_max_pct,
      altura_max_m: pd.altura_max_m,
      recuo_frontal_m: pd.recuo_frontal_m ?? 0,
      recuo_lateral_m: pd.recuo_lateral_m,
      recuo_fundos_m: pd.recuo_fundos_m,
      vagas_por_unidade: pd.vagas_por_unidade,
      permeabilidade_min_pct: pd.permeabilidade_min_pct,
    },
    area_terreno_m2: areaTerreno,
    area_construida_total_m2: ext.data.area_total_m2 ?? null,
    numero_pavimentos: ext.data.numero_pavimentos ?? 1,
    tem_garagem: ext.data.elementos_especiais?.garagem ?? false,
  });
  for (const f of zoneamentoFindings) {
    const icon = f.severity === "ok" ? "✅" : f.severity === "warn" ? "⚠️ " : "❌";
    console.log(`${icon} [${f.severity.toUpperCase().padEnd(5)}] ${f.rule}`);
    console.log(`   ${f.message}`);
  }

  // ============================================================
  // 4. NBR + CÓDIGO DE OBRAS
  // ============================================================
  divider("4️⃣  VALIDAÇÃO NBR + CÓDIGO DE OBRAS");
  const nbrFindings = runNbrChecks(ext.data);
  if (nbrFindings.length === 0) {
    console.log("✅ Nenhum problema detectado.");
  } else {
    for (const f of nbrFindings) {
      const icon = f.severity === "ok" ? "✅" : f.severity === "warn" ? "⚠️ " : "❌";
      console.log(
        `${icon} [${f.severity.toUpperCase().padEnd(5)}] ${f.rule}${f.ambiente ? ` (${f.ambiente})` : ""}`,
      );
      console.log(`   ${f.message}`);
    }
  }

  // ============================================================
  // 5. ORÇAMENTO SINAPI v3
  // ============================================================
  divider("5️⃣  ORÇAMENTO SINAPI v3");
  const planta: ExtractedPlantaV3 = {
    area_total_m2: ext.data.area_total_m2 ?? 0,
    numero_pavimentos: ext.data.numero_pavimentos ?? 1,
    tipologia: ext.data.tipologia,
    padrao_construtivo: ext.data.padrao_construtivo ?? null,
    ambientes: ext.data.ambientes ?? [],
    elementos_especiais: ext.data.elementos_especiais ?? {
      piscina: false,
      churrasqueira: false,
      sacada: false,
      garagem: false,
      jardim: false,
      area_servico_externa: false,
    },
  };
  const ruleItems = applyRulesV3(planta);
  console.log(`📦 Itens gerados pelas regras: ${ruleItems.length}`);

  // Buscar preços SINAPI
  const codes = Array.from(
    new Set(ruleItems.filter((i) => !i.preco_unitario_custom).map((i) => i.codigo_sinapi)),
  );
  const { data: precos } = await supabase
    .from("sinapi_compositions")
    .select("codigo, descricao, unidade, preco")
    .in("codigo", codes)
    .eq("uf", ORC_UF)
    .eq("mes_referencia", MES_REF)
    .eq("desonerado", DESONERADO);

  const priceByCode = new Map<string, { codigo: string; preco: string }>(
    (precos ?? []).map((p: { codigo: string; preco: string }) => [p.codigo, p]),
  );

  let totalBruto = new Big(0);
  let withPrice = 0;
  const missing: string[] = [];
  for (const item of ruleItems) {
    let preco: Big;
    if (item.preco_unitario_custom) {
      preco = item.preco_unitario_custom;
    } else {
      const p = priceByCode.get(item.codigo_sinapi);
      if (!p) {
        missing.push(item.codigo_sinapi);
        continue;
      }
      preco = new Big(p.preco);
    }
    const mult = item.multiplicador_preco ?? 1;
    totalBruto = totalBruto.plus(item.quantidade.times(preco).times(mult));
    withPrice++;
  }

  console.log(`Itens com preço SINAPI: ${withPrice}/${ruleItems.length}`);
  if (missing.length > 0) {
    console.log(
      `⚠ ${missing.length} itens sem preço SINAPI em ${ORC_UF}/${MES_REF}: ${[...new Set(missing)].slice(0, 5).join(", ")}${missing.length > 5 ? "…" : ""}`,
    );
  }

  const totalBrutoNum = Number(totalBruto.toString());
  const totalComBdi = totalBrutoNum * (1 + BDI_PCT / 100);
  const porM2 = (ext.data.area_total_m2 ?? 0) > 0 ? totalBrutoNum / ext.data.area_total_m2! : 0;

  console.log(`\n💰 Total bruto:        ${brl(totalBrutoNum)}`);
  console.log(`💰 Total c/ BDI ${BDI_PCT}%: ${brl(totalComBdi)}`);
  console.log(`💰 R$/m²:              ${brl(porM2)}`);

  // ============================================================
  // 6. CUB ESTADUAL CHECK
  // ============================================================
  divider(`6️⃣  CUB ESTADUAL — ${ORC_UF}`);
  const { data: cub } = await supabase
    .from("cub_estadual")
    .select("uf, padrao, faixa_min, faixa_max, fonte, mes_referencia")
    .eq("uf", ORC_UF)
    .eq("padrao", ext.data.padrao_construtivo ?? "medio")
    .order("mes_referencia", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (cub) {
    const faixaMin = Number(cub.faixa_min);
    const faixaMax = Number(cub.faixa_max);
    let status = "OK";
    let icon = "✅";
    if (porM2 < faixaMin * 0.85) {
      status = "ABAIXO";
      icon = "⚠️ ";
    } else if (porM2 > faixaMax * 1.25) {
      status = "ACIMA";
      icon = "❌";
    }
    console.log(
      `Faixa CUB ${cub.padrao} ${cub.uf} (${cub.mes_referencia}): ${brl(faixaMin)} – ${brl(faixaMax)}/m²`,
    );
    console.log(`Seu R$/m²:          ${brl(porM2)}`);
    console.log(`${icon} Status: ${status}`);
    console.log(`Fonte: ${cub.fonte}`);
  } else {
    console.log(
      `⚠ CUB de ${ORC_UF} padrão ${ext.data.padrao_construtivo} não encontrado no banco.`,
    );
  }

  // ============================================================
  // RESUMO
  // ============================================================
  divider("📊 RESUMO");
  const totalCusto = ext.usage.usd_cost + pd._usage.usd_cost;
  console.log(
    `Custo total do teste:    $${totalCusto.toFixed(4)} (≈ R$ ${(totalCusto * 5.5).toFixed(2)})`,
  );
  console.log(`  → Extração planta:     $${ext.usage.usd_cost.toFixed(4)}`);
  console.log(`  → Plano diretor IA:    $${pd._usage.usd_cost.toFixed(4)}`);
  console.log(`Tempo total:             ${((t1 - t0 + (t3 - t2)) / 1000).toFixed(1)}s`);
}

main().catch((e) => {
  console.error("\n❌ Erro:", e);
  process.exit(1);
});
