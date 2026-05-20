/**
 * Memorial.ai — Smoke test offline rules v3 (códigos SINAPI corretos)
 *
 * Aplica `applyRulesV3` em 3 cenários e valida que os totais caem
 * dentro da faixa CUB-SP correspondente.
 *
 * Run: npx tsx scripts/budget-v3-smoke.ts
 */

import Big from "big.js";
import {
  applyRulesV3,
  checkOrcamentoVsCubV3,
  type ExtractedPlantaV3,
} from "../lib/budget/rules/v3";

// Preços SINAPI v3 desonerado (UF=SP, 2026-05-01) — devem espelhar a migration
const PRECOS_SINAPI: Record<string, number> = {
  "96523": 135.0,
  "96619": 48.0,
  "94965": 850.0,
  "103328": 135.0,
  "87878": 18.5,
  "87905": 22.0,
  "87529": 48.0,
  "87530": 58.0,
  "94195": 85.0,
  "96109": 98.0,
  "90845": 680.0,
  "94573": 1100.0,
  "94569": 390.0,
  "87622": 58.0,
  "87248": 95.0,
  "87265": 118.0,
  "88485": 15.0,
  "88497": 32.0,
  "88489": 42.5,
  "104473": 185.0,
  "104480": 220.0,
  "104660": 1850.0,
  "104662": 950.0,
  "86931": 680.0,
  "86939": 420.0,
};

const AMBIENTES_PADRAO = [
  { nome: "Sala", area_m2: 22, tipo: "sala" },
  { nome: "Cozinha", area_m2: 12, tipo: "cozinha" },
  { nome: "Área de serviço", area_m2: 5, tipo: "area_servico" },
  { nome: "Banheiro social", area_m2: 5, tipo: "banheiro" },
  { nome: "Lavabo", area_m2: 3, tipo: "lavabo" },
  { nome: "Suíte", area_m2: 18, tipo: "suite" },
  { nome: "Quarto 1", area_m2: 12, tipo: "quarto" },
  { nome: "Quarto 2", area_m2: 12, tipo: "quarto" },
];

const SEM_ELEMENTOS = {
  piscina: false,
  churrasqueira: false,
  sacada: false,
  garagem: false,
  jardim: false,
  area_servico_externa: false,
};

const CENARIOS: Array<{
  nome: string;
  planta: ExtractedPlantaV3;
  faixaBrutoEsperada: { min: number; max: number };
}> = [
  {
    nome: "100m² popular sem elementos",
    planta: {
      area_total_m2: 100,
      numero_pavimentos: 1,
      tipologia: "residencial",
      padrao_construtivo: "popular",
      ambientes: AMBIENTES_PADRAO,
      elementos_especiais: SEM_ELEMENTOS,
    },
    faixaBrutoEsperada: { min: 160_000, max: 260_000 },
  },
  {
    nome: "100m² médio sem elementos (caso real do user)",
    planta: {
      area_total_m2: 100,
      numero_pavimentos: 1,
      tipologia: "residencial",
      padrao_construtivo: "medio",
      ambientes: AMBIENTES_PADRAO,
      elementos_especiais: SEM_ELEMENTOS,
    },
    faixaBrutoEsperada: { min: 215_000, max: 315_000 },
  },
  {
    nome: "130m² popular com jardim+garagem",
    planta: {
      area_total_m2: 130,
      numero_pavimentos: 1,
      tipologia: "residencial",
      padrao_construtivo: "popular",
      ambientes: [...AMBIENTES_PADRAO, { nome: "Garagem", area_m2: 22, tipo: "garagem" }],
      elementos_especiais: { ...SEM_ELEMENTOS, garagem: true, jardim: true },
    },
    faixaBrutoEsperada: { min: 230_000, max: 335_000 },
  },
];

function brl(n: number | Big): string {
  const num = typeof n === "number" ? n : Number(n.toString());
  return num.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function runScenario(scenario: (typeof CENARIOS)[number]): {
  pass: boolean;
  itemsDetail: string;
} {
  const { nome, planta, faixaBrutoEsperada } = scenario;
  console.log("=".repeat(76));
  console.log(`Cenário: ${nome}`);
  console.log("=".repeat(76));

  const items = applyRulesV3(planta);
  let total = new Big(0);
  let missing = 0;
  const detail: string[] = [];
  for (const item of items) {
    let preco: Big;
    let origem: string;
    if (item.preco_unitario_custom) {
      preco = item.preco_unitario_custom;
      origem = "custom";
    } else {
      const p = PRECOS_SINAPI[item.codigo_sinapi];
      if (p === undefined) {
        console.warn(`  ⚠ ${item.codigo_sinapi}: preço SINAPI não mapeado`);
        missing++;
        continue;
      }
      preco = new Big(p);
      // Aplica multiplicador de preço (espelha generate.action.ts)
      const mult = (item as { multiplicador_preco?: number }).multiplicador_preco;
      if (mult !== undefined && mult !== 1) preco = preco.times(mult);
      origem = "sinapi";
    }
    const subtotal = item.quantidade.times(preco);
    total = total.plus(subtotal);
    detail.push(
      `  [${origem.padEnd(6)}] ${item.codigo_sinapi.padEnd(35)} ${item.descricao_local.slice(0, 60).padEnd(60)} ${item.quantidade.toFixed(2).padStart(10)} ${item.unidade.padEnd(4)} × ${brl(Number(preco.toString())).padStart(12)} = ${brl(Number(subtotal.toString())).padStart(14)}`,
    );
  }

  const totalBdi = total.times(1.28);
  const area = planta.area_total_m2!;
  const totalNum = Number(total.toString());
  const totalBdiNum = Number(totalBdi.toString());
  const brutoM2 = totalNum / area;

  console.log(`Itens: ${items.length} (${missing} sem preço)`);
  console.log(`Total bruto:        ${brl(total)} (R$${brutoM2.toFixed(0)}/m²)`);
  console.log(`Total c/ BDI 28%:   ${brl(totalBdi)} (R$${(totalBdiNum / area).toFixed(0)}/m²)`);

  const cub = checkOrcamentoVsCubV3(totalNum, area, planta.padrao_construtivo);
  if (cub.ok) {
    console.log(
      `✅ CUB OK — dentro da faixa ${planta.padrao_construtivo} (R$${cub.faixa?.min}-${cub.faixa?.max}/m²)`,
    );
  } else {
    console.log(`⚠ ${cub.msg}`);
  }

  const inFaixa = totalNum >= faixaBrutoEsperada.min && totalNum <= faixaBrutoEsperada.max;
  console.log(
    `${inFaixa ? "✅" : "❌"} Faixa esperada R$${(faixaBrutoEsperada.min / 1000).toFixed(0)}k-R$${(faixaBrutoEsperada.max / 1000).toFixed(0)}k bruto: ${inFaixa ? "PASS" : "FAIL"}`,
  );
  console.log("");
  return { pass: inFaixa, itemsDetail: detail.join("\n") };
}

function main() {
  console.log("Memorial.ai — Smoke test offline rules v3 (códigos SINAPI corretos)\n");
  let failures = 0;
  for (const cenario of CENARIOS) {
    const { pass } = runScenario(cenario);
    if (!pass) failures++;
  }
  // Detalhe do cenário do user (médio 100m²)
  if (process.env.VERBOSE) {
    const detail = runScenario(CENARIOS[1]!);
    console.log("Detalhe dos itens (médio 100m²):");
    console.log(detail.itemsDetail);
  }
  if (failures > 0) {
    console.error(`❌ ${failures} cenário(s) fora da faixa CUB`);
    process.exit(1);
  }
  console.log(`✅ Todos os ${CENARIOS.length} cenários dentro da faixa CUB esperada`);
}

main();
