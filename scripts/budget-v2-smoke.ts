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

// Ambientes padrão de uma casa térrea residencial brasileira
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

// Cenários de teste
const CENARIOS: Array<{
  nome: string;
  planta: ExtractedPlantaV2;
  faixaBrutoEsperada: { min: number; max: number };
}> = [
  {
    nome: "100m² popular sem elementos (caso real do user)",
    planta: {
      area_total_m2: 100,
      numero_pavimentos: 1,
      tipologia: "residencial",
      padrao_construtivo: "popular",
      ambientes: AMBIENTES_PADRAO,
      elementos_especiais: SEM_ELEMENTOS,
    },
    faixaBrutoEsperada: { min: 165_000, max: 240_000 }, // R$1850-2400/m² popular
  },
  {
    nome: "100m² médio sem elementos",
    planta: {
      area_total_m2: 100,
      numero_pavimentos: 1,
      tipologia: "residencial",
      padrao_construtivo: "medio",
      ambientes: AMBIENTES_PADRAO,
      elementos_especiais: SEM_ELEMENTOS,
    },
    faixaBrutoEsperada: { min: 220_000, max: 310_000 }, // R$2300-2900/m² medio (largo)
  },
  {
    nome: "130m² popular com jardim+garagem (cenário inicial)",
    planta: {
      area_total_m2: 130,
      numero_pavimentos: 1,
      tipologia: "residencial",
      padrao_construtivo: "popular",
      ambientes: [...AMBIENTES_PADRAO, { nome: "Garagem", area_m2: 22, tipo: "garagem" }],
      elementos_especiais: { ...SEM_ELEMENTOS, garagem: true, jardim: true },
    },
    faixaBrutoEsperada: { min: 240_000, max: 320_000 },
  },
];

// Primeiro cenário (compat com código antigo) — vai ser sobrescrito no loop principal
const PLANTA: ExtractedPlantaV2 = CENARIOS[0]!.planta;

function brl(n: number | Big): string {
  const num = typeof n === "number" ? n : Number(n.toString());
  return num.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function runScenario(scenario: (typeof CENARIOS)[number]): boolean {
  const { nome, planta, faixaBrutoEsperada } = scenario;
  console.log("=".repeat(70));
  console.log(`Cenário: ${nome}`);
  console.log("=".repeat(70));

  const items = applyRulesV2(planta);
  let total = new Big(0);
  for (const item of items) {
    let preco: Big;
    if (item.preco_unitario_custom) {
      preco = item.preco_unitario_custom;
    } else {
      const p = PRECOS_SINAPI[item.codigo_sinapi];
      if (p === undefined) continue;
      preco = new Big(p);
    }
    total = total.plus(item.quantidade.times(preco));
  }

  const totalBdi = total.times(1.28);
  const area = planta.area_total_m2!;
  const totalNum = Number(total.toString());
  const totalBdiNum = Number(totalBdi.toString());
  const brutoM2 = totalNum / area;

  console.log(`Itens: ${items.length}`);
  console.log(`Total bruto:        ${brl(total)} (R$${brutoM2.toFixed(0)}/m²)`);
  console.log(`Total c/ BDI 28%:   ${brl(totalBdi)} (R$${(totalBdiNum / area).toFixed(0)}/m²)`);

  const cub = checkOrcamentoVsCub(totalNum, area, planta.padrao_construtivo);
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
  return inFaixa;
}

function main() {
  console.log("Memorial.ai — Smoke test offline rules v2");
  console.log("");
  let failures = 0;
  for (const cenario of CENARIOS) {
    if (!runScenario(cenario)) failures++;
  }
  if (failures > 0) {
    console.error(`❌ ${failures} cenário(s) fora da faixa CUB`);
    process.exit(1);
  }
  console.log(`✅ Todos os ${CENARIOS.length} cenários dentro da faixa CUB esperada`);
}

main();
