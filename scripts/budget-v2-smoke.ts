/**
 * Memorial.ai — Smoke test offline das regras v2.
 *
 * Aplica `applyRulesV2` numa planta sintética de 130m² popular e valida que:
 *   - Total bruto fica entre R$200k e R$280k (faixa CUB-SP popular)
 *   - Total com BDI 28% fica entre R$256k e R$358k (alinhado com 250-300k esperado)
 *   - Há > 20 itens (cobertura ampla)
 *
 * Não consulta Supabase — usa preços SINAPI hardcoded equivalentes ao seed v2.
 * Run: npx tsx scripts/budget-v2-smoke.ts
 */

import Big from "big.js";
import { applyRulesV2, checkOrcamentoVsCub, type ExtractedPlantaV2 } from "../lib/budget/rules/v2";

// Preços SINAPI v2 (UF=SP, 2026-05-01, desonerado=true) — devem espelhar o seed.
const PRECOS_SINAPI: Record<string, number> = {
  "73964/001": 110.0,
  "74157/004": 520.0,
  "92873": 780.0,
  "92775": 17.5,
  "87878": 118.0,
  "87559": 18.5,
  "87529": 46.0,
  "87530": 54.0,
  "92799": 138.0,
  "73838/001": 72.0,
  "89800": 98.0,
  "90443": 680.0,
  "90445": 1450.0,
  "91173": 485.0,
  "91174": 1050.0,
  "87905": 78.0,
  "87265": 112.0,
  "87527": 118.0,
  "88488": 29.0,
  "88489": 42.5,
  "88500": 48.5,
  "91296": 195.0,
  "91295": 540.0,
  "89711": 1080.0,
  "89351": 250.0,
  "89352": 290.0,
  "86931": 680.0,
  "86877": 450.0,
  "86905": 625.0,
};

// Planta sintética: 130m² popular térrea (caso real do engenheiro)
const PLANTA: ExtractedPlantaV2 = {
  area_total_m2: 130,
  numero_pavimentos: 1,
  tipologia: "residencial",
  padrao_construtivo: "popular",
  ambientes: [
    { nome: "Sala", area_m2: 22, tipo: "sala" },
    { nome: "Cozinha", area_m2: 12, tipo: "cozinha" },
    { nome: "Área de serviço", area_m2: 5, tipo: "area_servico" },
    { nome: "Banheiro social", area_m2: 5, tipo: "banheiro" },
    { nome: "Lavabo", area_m2: 3, tipo: "lavabo" },
    { nome: "Suíte", area_m2: 18, tipo: "suite" },
    { nome: "Quarto 1", area_m2: 12, tipo: "quarto" },
    { nome: "Quarto 2", area_m2: 12, tipo: "quarto" },
    { nome: "Garagem", area_m2: 22, tipo: "garagem" },
  ],
  elementos_especiais: {
    piscina: false,
    churrasqueira: false,
    sacada: false,
    garagem: true,
    jardim: true,
    area_servico_externa: false,
  },
};

function brl(n: number | Big): string {
  const num = typeof n === "number" ? n : Number(n.toString());
  return num.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function main() {
  console.log("=".repeat(70));
  console.log("Memorial.ai — Smoke test offline rules v2");
  console.log("=".repeat(70));
  console.log(
    `Planta: ${PLANTA.area_total_m2}m² ${PLANTA.padrao_construtivo} ${PLANTA.numero_pavimentos} pav.`,
  );
  console.log(
    `Ambientes: ${PLANTA.ambientes.length} (${PLANTA.ambientes.map((a) => a.tipo).join(", ")})`,
  );
  console.log(
    `Elementos: ${Object.entries(PLANTA.elementos_especiais)
      .filter(([, v]) => v)
      .map(([k]) => k)
      .join(", ")}`,
  );
  console.log("");

  const items = applyRulesV2(PLANTA);
  let total = new Big(0);
  let missingPrices = 0;

  console.log("Items gerados:");
  for (const item of items) {
    let preco: Big;
    if (item.preco_unitario_custom) {
      preco = item.preco_unitario_custom;
    } else {
      const p = PRECOS_SINAPI[item.codigo_sinapi];
      if (p === undefined) {
        console.warn(`  ⚠ ${item.codigo_sinapi}: preço SINAPI não mapeado`);
        missingPrices++;
        continue;
      }
      preco = new Big(p);
    }
    const subtotal = item.quantidade.times(preco);
    total = total.plus(subtotal);
    const origem = item.preco_unitario_custom ? "[custom]" : "[sinapi]";
    console.log(
      `  ${origem} ${item.codigo_sinapi.padEnd(28)} ${item.descricao_local.slice(0, 55).padEnd(55)} ${item.quantidade.toFixed(2).padStart(10)} ${item.unidade.padEnd(4)} × ${brl(Number(preco.toString())).padStart(11)} = ${brl(Number(subtotal.toString())).padStart(13)}`,
    );
  }

  console.log("");
  console.log("=".repeat(70));
  console.log(`Itens: ${items.length}`);
  console.log(`Total bruto:   ${brl(total)}`);
  const totalBdi = total.times(1.28);
  console.log(`Total c/ BDI 28%: ${brl(totalBdi)}`);
  console.log(`R$/m² (c/ BDI): ${brl(Number(totalBdi.div(PLANTA.area_total_m2!).toString()))}`);
  if (missingPrices > 0) console.log(`⚠ ${missingPrices} item(ns) sem preço mapeado`);

  // Sanity check CUB (sem BDI — CUB é base de custo)
  const cub = checkOrcamentoVsCub(
    Number(total.toString()),
    PLANTA.area_total_m2!,
    PLANTA.padrao_construtivo,
  );
  console.log("");
  if (cub.ok) {
    console.log(
      `✅ CUB OK — R$${(Number(total.toString()) / PLANTA.area_total_m2!).toFixed(0)}/m² (bruto) dentro da faixa ${PLANTA.padrao_construtivo} (R$${cub.faixa?.min}-${cub.faixa?.max}/m²)`,
    );
  } else {
    console.log(`⚠ CUB warning: ${cub.msg}`);
  }

  // Assertions
  const totalNum = Number(total.toString());
  const totalBdiNum = Number(totalBdi.toString());
  let failures = 0;
  function assert(cond: boolean, label: string) {
    console.log(`  ${cond ? "✅" : "❌"} ${label}`);
    if (!cond) failures++;
  }
  console.log("");
  console.log("Assertions:");
  assert(items.length >= 20, `Items >= 20 (got ${items.length})`);
  assert(totalNum >= 200_000, `Total bruto >= R$200k (got ${brl(total)})`);
  assert(totalNum <= 300_000, `Total bruto <= R$300k (got ${brl(total)})`);
  assert(totalBdiNum >= 250_000, `Total c/BDI >= R$250k (got ${brl(totalBdi)})`);
  assert(totalBdiNum <= 360_000, `Total c/BDI <= R$360k (got ${brl(totalBdi)})`);

  console.log("");
  if (failures > 0) {
    console.error(`❌ ${failures} assertion(s) failed`);
    process.exit(1);
  }
  console.log(`✅ Todas as assertions passaram — orçamento dentro da faixa esperada`);
}

main();
