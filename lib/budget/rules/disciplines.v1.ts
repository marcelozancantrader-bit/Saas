/**
 * Memorial.ai — Regras de orçamento por disciplina complementar (Sprint 10).
 *
 * Cada função consome a extração da disciplina (electrical/hydraulic/structural/gas/hvac)
 * vinda de `projects.meta.extracoes_disciplinas[<disciplina>].data` e retorna `RuleItem[]`
 * compatível com o pipeline já existente (`lib/budget/rules/v1.ts`).
 *
 * Para gás e HVAC não existem composições SINAPI 1:1 — esses casos retornam itens
 * `origem='custom'` com preço de referência de mercado (não usado no orçamento agregado
 * por enquanto, fica como hook para sprints futuros).
 *
 * NUNCA sobrescrever este arquivo — criar v2 se mudar schema.
 */

import Big from "big.js";
import type { RuleItem } from "./v1";

export const DISCIPLINE_RULES_VERSION = "disciplines.v1" as const;

function big(n: number): Big {
  return new Big(n.toFixed(4));
}

// =============================================================================
// ELÉTRICO — SINAPI 91931 / 91933 / 91929 (cabos), 91295 (quadro), 91296 (pontos)
// =============================================================================

export type ElectricalData = {
  total_tomadas?: number | null;
  total_interruptores?: number | null;
  total_luminarias?: number | null;
  circuitos?: Array<{
    tipo: string;
    quantidade: number;
    bitola_mm2: number | null;
  }>;
  quadro_distribuicao?: {
    quantidade?: number | null;
    disjuntores_total?: number | null;
    tem_dps?: boolean;
    tem_dr?: boolean;
  };
};

const COMPRIMENTO_MEDIO_CIRCUITO_M = 18; // metros médios de cabo por circuito residencial

export function rulesElectricalSinapi(d: ElectricalData): RuleItem[] {
  const items: RuleItem[] = [];

  // Cabos por bitola — agrupa metragem por mm²
  const metragemPorBitola = new Map<number, number>();
  for (const c of d.circuitos ?? []) {
    if (!c.bitola_mm2) continue;
    const total = c.quantidade * COMPRIMENTO_MEDIO_CIRCUITO_M;
    metragemPorBitola.set(c.bitola_mm2, (metragemPorBitola.get(c.bitola_mm2) ?? 0) + total);
  }
  const bitolaToSinapi: Record<number, { codigo: string; descricao: string }> = {
    1.5: { codigo: "91929", descricao: "Cabo flexível 1,5mm² (iluminação)" },
    2.5: { codigo: "91931", descricao: "Cabo flexível 2,5mm² (tomadas)" },
    4.0: { codigo: "91933", descricao: "Cabo flexível 4mm² (chuveiro/AC)" },
    6.0: { codigo: "91934", descricao: "Cabo flexível 6mm²" },
    10.0: { codigo: "91935", descricao: "Cabo flexível 10mm²" },
  };
  for (const [bitola, metros] of metragemPorBitola) {
    const m = bitolaToSinapi[bitola];
    if (!m) continue;
    items.push({
      codigo_sinapi: m.codigo,
      descricao_local: m.descricao,
      unidade: "m",
      quantidade: big(metros),
      rule_id: `eletrico.cabo-${bitola}`,
    });
  }

  // Tomadas (kit caixa + tomada). 1 ponto = 1 tomada instalada.
  if (d.total_tomadas && d.total_tomadas > 0) {
    items.push({
      codigo_sinapi: "91953",
      descricao_local: `Tomadas 2P+T 10A (${d.total_tomadas} pontos)`,
      unidade: "un",
      quantidade: big(d.total_tomadas),
      rule_id: "eletrico.tomadas",
    });
  }
  if (d.total_interruptores && d.total_interruptores > 0) {
    items.push({
      codigo_sinapi: "91952",
      descricao_local: `Interruptores simples/paralelos (${d.total_interruptores})`,
      unidade: "un",
      quantidade: big(d.total_interruptores),
      rule_id: "eletrico.interruptores",
    });
  }
  if (d.total_luminarias && d.total_luminarias > 0) {
    items.push({
      codigo_sinapi: "97586",
      descricao_local: `Pontos de luminária (${d.total_luminarias})`,
      unidade: "un",
      quantidade: big(d.total_luminarias),
      rule_id: "eletrico.luminarias",
    });
  }

  // Quadro + disjuntores
  const qdQtd = d.quadro_distribuicao?.quantidade ?? 1;
  items.push({
    codigo_sinapi: "91295",
    descricao_local: "Quadro de distribuição embutido",
    unidade: "un",
    quantidade: big(qdQtd),
    rule_id: "eletrico.quadro",
  });
  if (d.quadro_distribuicao?.disjuntores_total && d.quadro_distribuicao.disjuntores_total > 0) {
    items.push({
      codigo_sinapi: "93653",
      descricao_local: `Disjuntores monopolares (${d.quadro_distribuicao.disjuntores_total})`,
      unidade: "un",
      quantidade: big(d.quadro_distribuicao.disjuntores_total),
      rule_id: "eletrico.disjuntores",
    });
  }
  if (d.quadro_distribuicao?.tem_dr) {
    items.push({
      codigo_sinapi: "93654",
      descricao_local: "Disjuntor DR (proteção residual)",
      unidade: "un",
      quantidade: big(qdQtd),
      rule_id: "eletrico.dr",
    });
  }
  if (d.quadro_distribuicao?.tem_dps) {
    items.push({
      codigo_sinapi: "93655",
      descricao_local: "DPS classe II (proteção contra surto)",
      unidade: "un",
      quantidade: big(qdQtd),
      rule_id: "eletrico.dps",
    });
  }

  return items;
}

// =============================================================================
// HIDRÁULICO — SINAPI 89711 / 89714 / 89732 (PVC 25/32/100), 89351/89352 (pontos)
// =============================================================================

export type HydraulicData = {
  total_pontos_agua_fria?: number | null;
  total_pontos_agua_quente?: number | null;
  total_pontos_esgoto?: number | null;
  total_ralos?: number | null;
  reservatorio?: { capacidade_l?: number | null; elevado?: boolean; inferior?: boolean };
  tratamento_esgoto?: {
    tem_fossa_septica?: boolean;
    tem_sumidouro?: boolean;
    capacidade_l?: number | null;
  };
  tubulacao_estimada?: {
    pvc_25mm_metros?: number | null;
    pvc_32mm_metros?: number | null;
    pvc_50mm_metros?: number | null;
    pvc_100mm_metros?: number | null;
  };
};

// Fallback: metros estimados por ponto se a extração não cotou tubulação.
const M_POR_PONTO_AF = 6; // metros de PVC 25mm por ponto de água fria
const M_POR_PONTO_ESG = 4; // metros de PVC 50mm/100mm por ponto de esgoto

export function rulesHydraulicSinapi(d: HydraulicData): RuleItem[] {
  const items: RuleItem[] = [];

  const pvc25 =
    d.tubulacao_estimada?.pvc_25mm_metros ?? (d.total_pontos_agua_fria ?? 0) * M_POR_PONTO_AF;
  if (pvc25 > 0) {
    items.push({
      codigo_sinapi: "89711",
      descricao_local: "Tubo PVC soldável 25mm (água fria ramais)",
      unidade: "m",
      quantidade: big(pvc25),
      rule_id: "hidraulica.pvc-25",
    });
  }
  if ((d.tubulacao_estimada?.pvc_32mm_metros ?? 0) > 0) {
    items.push({
      codigo_sinapi: "89714",
      descricao_local: "Tubo PVC soldável 32mm (água fria coluna)",
      unidade: "m",
      quantidade: big(d.tubulacao_estimada?.pvc_32mm_metros ?? 0),
      rule_id: "hidraulica.pvc-32",
    });
  }
  const pvc100 =
    d.tubulacao_estimada?.pvc_100mm_metros ?? (d.total_pontos_esgoto ?? 0) * M_POR_PONTO_ESG;
  if (pvc100 > 0) {
    items.push({
      codigo_sinapi: "89732",
      descricao_local: "Tubo PVC esgoto 100mm",
      unidade: "m",
      quantidade: big(pvc100),
      rule_id: "hidraulica.pvc-100",
    });
  }

  // Pontos
  if ((d.total_pontos_agua_fria ?? 0) > 0) {
    items.push({
      codigo_sinapi: "89351",
      descricao_local: `Pontos de água fria (${d.total_pontos_agua_fria})`,
      unidade: "un",
      quantidade: big(d.total_pontos_agua_fria ?? 0),
      rule_id: "hidraulica.pontos-agua",
    });
  }
  if ((d.total_pontos_esgoto ?? 0) > 0) {
    items.push({
      codigo_sinapi: "89352",
      descricao_local: `Pontos de esgoto (${d.total_pontos_esgoto})`,
      unidade: "un",
      quantidade: big(d.total_pontos_esgoto ?? 0),
      rule_id: "hidraulica.pontos-esgoto",
    });
  }

  // Reservatório (usa código existente 89711 base — usuários podem trocar depois)
  if (d.reservatorio?.capacidade_l && d.reservatorio.capacidade_l > 0) {
    items.push({
      codigo_sinapi: "89711",
      descricao_local: `Caixa d'água ${d.reservatorio.capacidade_l}L instalada`,
      unidade: "un",
      quantidade: big(1),
      rule_id: "hidraulica.caixa-dagua",
    });
  }

  // Fossa séptica (composição típica)
  if (d.tratamento_esgoto?.tem_fossa_septica) {
    items.push({
      codigo_sinapi: "74104/001",
      descricao_local: `Fossa séptica${d.tratamento_esgoto.capacidade_l ? ` ${d.tratamento_esgoto.capacidade_l}L` : ""}`,
      unidade: "un",
      quantidade: big(1),
      rule_id: "hidraulica.fossa-septica",
    });
  }

  return items;
}

// =============================================================================
// ESTRUTURAL — SINAPI 92478 (concreto 25 MPa) / 92797 (aço CA-50)
// =============================================================================

export type StructuralData = {
  fck_mpa?: number | null;
  volume_concreto_m3?: number | null;
  aco_kg_total?: number | null;
  fundacao?: { tipo?: string };
};

export function rulesStructuralSinapi(d: StructuralData): RuleItem[] {
  const items: RuleItem[] = [];

  if (d.volume_concreto_m3 && d.volume_concreto_m3 > 0) {
    const fck = d.fck_mpa ?? 25;
    items.push({
      codigo_sinapi: fck >= 30 ? "92479" : "92478",
      descricao_local: `Concreto estrutural fck=${fck} MPa`,
      unidade: "m³",
      quantidade: big(d.volume_concreto_m3),
      rule_id: "estrutural.concreto",
    });
  }

  if (d.aco_kg_total && d.aco_kg_total > 0) {
    items.push({
      codigo_sinapi: "92797",
      descricao_local: "Aço CA-50 (corte, dobra e armação)",
      unidade: "kg",
      quantidade: big(d.aco_kg_total),
      rule_id: "estrutural.aco",
    });
  }

  return items;
}

// =============================================================================
// GÁS — sem SINAPI direto, preços de mercado em BRL/un (informativo)
// =============================================================================

export type GasData = {
  tipo?: string;
  total_pontos?: number | null;
  tubulacao_cobre_metros?: number | null;
  registros?: number | null;
  central_glp?: { capacidade_kg?: number | null; qtd_cilindros?: number | null };
};

export type MarketItem = {
  descricao: string;
  unidade: string;
  quantidade: Big;
  preco_unitario_ref: Big;
  rule_id: string;
};

const GAS_PRECOS_REF_BRL = {
  cobre_15mm_m: 95,
  registro: 180,
  central_p45: 1200,
  central_p90: 2200,
};

export function rulesGasMarket(d: GasData): MarketItem[] {
  const items: MarketItem[] = [];
  if ((d.tubulacao_cobre_metros ?? 0) > 0) {
    items.push({
      descricao: "Tubulação cobre/multicamada 15mm para gás",
      unidade: "m",
      quantidade: big(d.tubulacao_cobre_metros ?? 0),
      preco_unitario_ref: big(GAS_PRECOS_REF_BRL.cobre_15mm_m),
      rule_id: "gas.tubulacao",
    });
  }
  if ((d.registros ?? 0) > 0) {
    items.push({
      descricao: "Registros de gás (corte + esfera)",
      unidade: "un",
      quantidade: big(d.registros ?? 0),
      preco_unitario_ref: big(GAS_PRECOS_REF_BRL.registro),
      rule_id: "gas.registros",
    });
  }
  if (d.tipo === "glp" && d.central_glp?.capacidade_kg && d.central_glp.capacidade_kg > 0) {
    const preco =
      d.central_glp.capacidade_kg >= 90
        ? GAS_PRECOS_REF_BRL.central_p90
        : GAS_PRECOS_REF_BRL.central_p45;
    items.push({
      descricao: `Central GLP ${d.central_glp.capacidade_kg}kg (abrigo + conexões)`,
      unidade: "un",
      quantidade: big(1),
      preco_unitario_ref: big(preco),
      rule_id: "gas.central",
    });
  }
  return items;
}

// =============================================================================
// HVAC — sem SINAPI direto, preços de mercado em BRL (informativo)
// =============================================================================

export type HvacData = {
  sistema?: string;
  total_splits?: number | null;
  capacidade_total_btu?: number | null;
  duto_metros?: number | null;
  splits_por_ambiente?: Array<{ ambiente: string; capacidade_btu: number | null }>;
};

const HVAC_PRECOS_REF_BRL = {
  split_9k: 2200,
  split_12k: 2700,
  split_18k: 3500,
  split_24k: 4200,
  split_30k: 5400,
  duto_m: 320,
  exaustao: 280,
};

function precoSplitPorBtu(btu: number): number {
  if (btu <= 10000) return HVAC_PRECOS_REF_BRL.split_9k;
  if (btu <= 14000) return HVAC_PRECOS_REF_BRL.split_12k;
  if (btu <= 20000) return HVAC_PRECOS_REF_BRL.split_18k;
  if (btu <= 26000) return HVAC_PRECOS_REF_BRL.split_24k;
  return HVAC_PRECOS_REF_BRL.split_30k;
}

export function rulesHvacMarket(d: HvacData): MarketItem[] {
  const items: MarketItem[] = [];
  // Splits individualizados se a extração trouxe a lista
  if (d.splits_por_ambiente && d.splits_por_ambiente.length > 0) {
    // Agrupa por capacidade
    const byCap = new Map<number, number>();
    for (const s of d.splits_por_ambiente) {
      if (!s.capacidade_btu) continue;
      byCap.set(s.capacidade_btu, (byCap.get(s.capacidade_btu) ?? 0) + 1);
    }
    for (const [btu, qtd] of byCap) {
      items.push({
        descricao: `Split ${btu.toLocaleString("pt-BR")} BTU (instalação incluída)`,
        unidade: "un",
        quantidade: big(qtd),
        preco_unitario_ref: big(precoSplitPorBtu(btu)),
        rule_id: `hvac.split-${btu}`,
      });
    }
  } else if ((d.total_splits ?? 0) > 0 && (d.capacidade_total_btu ?? 0) > 0) {
    // Fallback: divide BTU total por nº de splits, usa faixa média
    const btuMedio = Math.round((d.capacidade_total_btu ?? 0) / (d.total_splits ?? 1));
    items.push({
      descricao: `Splits ${btuMedio.toLocaleString("pt-BR")} BTU médio (${d.total_splits} un.)`,
      unidade: "un",
      quantidade: big(d.total_splits ?? 0),
      preco_unitario_ref: big(precoSplitPorBtu(btuMedio)),
      rule_id: "hvac.splits-medio",
    });
  }

  if ((d.duto_metros ?? 0) > 0) {
    items.push({
      descricao: "Dutos flexíveis isolados",
      unidade: "m",
      quantidade: big(d.duto_metros ?? 0),
      preco_unitario_ref: big(HVAC_PRECOS_REF_BRL.duto_m),
      rule_id: "hvac.dutos",
    });
  }

  return items;
}

// =============================================================================
// Total agregado helper
// =============================================================================

export function totalMarketItems(items: MarketItem[]): Big {
  let total = new Big(0);
  for (const i of items) {
    total = total.plus(i.quantidade.times(i.preco_unitario_ref));
  }
  return total;
}
