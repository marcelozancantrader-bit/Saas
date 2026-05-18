/**
 * Memorial.ai — Regras de orçamento heurístico v1
 *
 * NÃO USA IA. Mapeia dados de `projects.meta.extracao_planta` (extração da planta por IA, Sprint 3)
 * para uma lista de itens SINAPI a serem inseridos em `budget_items`.
 *
 * Premissa: a IA já extraiu áreas/ambientes/elementos especiais. Aqui só fazemos a tradução
 * "quantitativos por composição SINAPI". Cada regra retorna um item com código SINAPI + quantidade.
 *
 * Esta é a v1. Quando refinarmos, criar v2.ts (NUNCA sobrescrever). Cada budget guarda
 * `budget.rules_version` para reprodutibilidade.
 */

import Big from "big.js";

// =============================================================================
// Tipos
// =============================================================================

export const RULES_VERSION = "v1" as const;

export type ExtractedPlanta = {
  area_total_m2: number | null;
  numero_pavimentos: number | null;
  tipologia: "residencial" | "comercial" | "reforma" | "outros";
  padrao_construtivo: "popular" | "medio" | "alto" | "luxo" | null;
  ambientes: Array<{
    nome: string;
    area_m2: number | null;
    tipo: string;
  }>;
  elementos_especiais: {
    piscina: boolean;
    churrasqueira: boolean;
    sacada: boolean;
    garagem: boolean;
    jardim: boolean;
    area_servico_externa: boolean;
  };
};

export type RuleItem = {
  codigo_sinapi: string;
  descricao_local: string;
  unidade: string;
  quantidade: Big;
  /** Para auditoria — qual regra gerou este item. */
  rule_id: string;
};

// =============================================================================
// Heurísticas auxiliares
// =============================================================================

const PE_DIREITO_M = 2.8; // Altura padrão piso-teto, residencial
const FATOR_PAREDES_INTERNAS = 0.45; // Comprimento de paredes internas por m² de área construída

/** Estima perímetro externo a partir da área (assume planta aproximadamente retangular 4:3). */
function perimetroExternoEstimado(areaM2: number): number {
  // P = 2*(L+W), Area = L*W, com proporção W/L = 0.75:
  // L = sqrt(area / 0.75), W = 0.75 * L
  // P = 2 * (L + 0.75 * L) = 3.5 * L = 3.5 * sqrt(area / 0.75)
  return 3.5 * Math.sqrt(areaM2 / 0.75);
}

/** Conta ambientes por categoria (sala, quarto, banheiro, etc). */
function contarPorTipo(ambientes: ExtractedPlanta["ambientes"], tipos: string[]): number {
  return ambientes.filter((a) => tipos.includes(a.tipo)).length;
}

function big(n: number): Big {
  return new Big(n.toFixed(4));
}

// =============================================================================
// REGRAS — cada função retorna 0+ items para o orçamento
// =============================================================================

type Rule = (planta: ExtractedPlanta) => RuleItem[];

const ruleFundacao: Rule = (p) => {
  const area = p.area_total_m2;
  if (!area || area <= 0) return [];
  const perim = perimetroExternoEstimado(area);

  return [
    // Escavação para sapata corrida — 0.6m profundidade × 0.4m largura × perímetro
    {
      codigo_sinapi: "73964/001",
      descricao_local: "Escavação para sapata corrida",
      unidade: "m³",
      quantidade: big(perim * 0.4 * 0.6),
      rule_id: "fundacao.escavacao",
    },
    // Concreto magro
    {
      codigo_sinapi: "74157/004",
      descricao_local: "Concreto magro de regularização",
      unidade: "m³",
      quantidade: big(perim * 0.4 * 0.05),
      rule_id: "fundacao.concreto-magro",
    },
    // Concreto estrutural
    {
      codigo_sinapi: "92873",
      descricao_local: "Concreto fck=25 MPa (sapata + cinta de baldrame)",
      unidade: "m³",
      quantidade: big(perim * 0.4 * 0.3),
      rule_id: "fundacao.concreto-25",
    },
    // Aço CA-50 — estimativa 80 kg/m³ de concreto estrutural
    {
      codigo_sinapi: "92775",
      descricao_local: "Armadura CA-50 para fundação",
      unidade: "kg",
      quantidade: big(perim * 0.4 * 0.3 * 80),
      rule_id: "fundacao.aco",
    },
  ];
};

const ruleAlvenaria: Rule = (p) => {
  const area = p.area_total_m2;
  if (!area || area <= 0) return [];
  const perim = perimetroExternoEstimado(area);
  // Área de paredes = paredes externas + paredes internas (ambas computadas pelos dois lados)
  const areaParedesExternas = perim * PE_DIREITO_M;
  const areaParedesInternas = area * FATOR_PAREDES_INTERNAS * PE_DIREITO_M;
  const areaParedesTotal = areaParedesExternas + areaParedesInternas;

  return [
    {
      codigo_sinapi: "87878",
      descricao_local: "Alvenaria de blocos cerâmicos",
      unidade: "m²",
      quantidade: big(areaParedesTotal),
      rule_id: "alvenaria.blocos",
    },
    {
      codigo_sinapi: "87559",
      descricao_local: "Chapisco em paredes (interno + externo)",
      unidade: "m²",
      quantidade: big(areaParedesTotal * 2), // chapisco em ambos os lados
      rule_id: "alvenaria.chapisco",
    },
    {
      codigo_sinapi: "87529",
      descricao_local: "Emboço interno",
      unidade: "m²",
      quantidade: big(areaParedesInternas * 2 + areaParedesExternas), // ambos lados das int. + lado interno das ext.
      rule_id: "alvenaria.emboco-interno",
    },
    {
      codigo_sinapi: "87530",
      descricao_local: "Emboço externo",
      unidade: "m²",
      quantidade: big(areaParedesExternas), // só lado externo
      rule_id: "alvenaria.emboco-externo",
    },
  ];
};

const ruleCobertura: Rule = (p) => {
  const area = p.area_total_m2;
  if (!area || area <= 0) return [];
  // Área da cobertura ~= área construída × 1.15 (inclinação ~30%)
  const areaCobertura = area * 1.15;

  return [
    {
      codigo_sinapi: "92799",
      descricao_local: "Estrutura de madeira para telhado",
      unidade: "m²",
      quantidade: big(areaCobertura),
      rule_id: "cobertura.estrutura",
    },
    {
      codigo_sinapi: "73838/001",
      descricao_local: "Telha cerâmica + cumeeira",
      unidade: "m²",
      quantidade: big(areaCobertura),
      rule_id: "cobertura.telhas",
    },
    {
      codigo_sinapi: "89800",
      descricao_local: "Forro de gesso interno",
      unidade: "m²",
      quantidade: big(area * 0.9), // 90% da área (descontando áreas sem forro)
      rule_id: "cobertura.forro",
    },
  ];
};

const ruleEsquadrias: Rule = (p) => {
  const items: RuleItem[] = [];
  const ambientes = p.ambientes;

  // 1 porta de entrada
  items.push({
    codigo_sinapi: "90445",
    descricao_local: "Porta de entrada",
    unidade: "un",
    quantidade: big(1),
    rule_id: "esquadrias.porta-entrada",
  });

  // Portas internas: 1 para cada ambiente "fechado" (quarto, suíte, banheiro, lavabo, escritório)
  const portasInternas = contarPorTipo(ambientes, [
    "quarto",
    "suite",
    "banheiro",
    "lavabo",
    "escritorio",
    "deposito",
  ]);
  if (portasInternas > 0) {
    items.push({
      codigo_sinapi: "90443",
      descricao_local: `Portas internas (${portasInternas} ambientes)`,
      unidade: "un",
      quantidade: big(portasInternas),
      rule_id: "esquadrias.portas-internas",
    });
  }

  // Janelas: 1 grande por quarto/sala/cozinha + 1 pequena por banheiro
  const janelasGrandes = contarPorTipo(ambientes, ["quarto", "suite", "sala", "cozinha"]);
  const janelasPequenas = contarPorTipo(ambientes, ["banheiro", "lavabo", "area_servico"]);
  if (janelasGrandes > 0) {
    items.push({
      codigo_sinapi: "91174",
      descricao_local: "Janelas de correr 150x120",
      unidade: "un",
      quantidade: big(janelasGrandes),
      rule_id: "esquadrias.janelas-grandes",
    });
  }
  if (janelasPequenas > 0) {
    items.push({
      codigo_sinapi: "91173",
      descricao_local: "Janelas basculantes 60x60",
      unidade: "un",
      quantidade: big(janelasPequenas),
      rule_id: "esquadrias.janelas-pequenas",
    });
  }

  return items;
};

const rulePisosRevestimentos: Rule = (p) => {
  const area = p.area_total_m2;
  if (!area || area <= 0) return [];

  const items: RuleItem[] = [
    {
      codigo_sinapi: "87905",
      descricao_local: "Contrapiso para acabamento",
      unidade: "m²",
      quantidade: big(area),
      rule_id: "pisos.contrapiso",
    },
    {
      codigo_sinapi: "87265",
      descricao_local: "Piso cerâmico assentado",
      unidade: "m²",
      quantidade: big(area * 0.95), // 95% (alguns recortes)
      rule_id: "pisos.ceramico",
    },
  ];

  // Revestimento cerâmico em paredes molhadas
  const banheiros = contarPorTipo(p.ambientes, ["banheiro", "lavabo"]);
  const cozinhas = contarPorTipo(p.ambientes, ["cozinha", "area_servico"]);
  const areaRevPared = banheiros * 25 + cozinhas * 15;
  if (areaRevPared > 0) {
    items.push({
      codigo_sinapi: "87527",
      descricao_local: `Revestimento cerâmico parede (${banheiros} banh. + ${cozinhas} cozinha/área)`,
      unidade: "m²",
      quantidade: big(areaRevPared),
      rule_id: "pisos.revestimento-parede",
    });
  }

  return items;
};

const rulePintura: Rule = (p) => {
  const area = p.area_total_m2;
  if (!area || area <= 0) return [];
  const perim = perimetroExternoEstimado(area);
  const areaParedesExt = perim * PE_DIREITO_M;
  const areaParedesInt = area * FATOR_PAREDES_INTERNAS * PE_DIREITO_M;
  // Pintura interna: paredes internas (ambos os lados) + lado interno das externas
  const areaPinturaInt = areaParedesInt * 2 + areaParedesExt;

  return [
    {
      codigo_sinapi: "88488",
      descricao_local: "Massa corrida + lixamento (paredes internas)",
      unidade: "m²",
      quantidade: big(areaPinturaInt),
      rule_id: "pintura.massa",
    },
    {
      codigo_sinapi: "88489",
      descricao_local: "Pintura PVA látex paredes internas",
      unidade: "m²",
      quantidade: big(areaPinturaInt),
      rule_id: "pintura.interna",
    },
    {
      codigo_sinapi: "88500",
      descricao_local: "Pintura acrílica paredes externas",
      unidade: "m²",
      quantidade: big(areaParedesExt),
      rule_id: "pintura.externa",
    },
  ];
};

const ruleEletrica: Rule = (p) => {
  const area = p.area_total_m2;
  if (!area || area <= 0) return [];
  // Pontos elétricos: ~8 pontos por ambiente principal + 4 pontos por cômodo de serviço
  const principais = contarPorTipo(p.ambientes, [
    "sala",
    "cozinha",
    "quarto",
    "suite",
    "escritorio",
  ]);
  const servico = contarPorTipo(p.ambientes, [
    "banheiro",
    "lavabo",
    "area_servico",
    "varanda",
    "garagem",
    "deposito",
  ]);
  const pontos = principais * 8 + servico * 4;

  return [
    {
      codigo_sinapi: "91295",
      descricao_local: "Quadro de distribuição",
      unidade: "un",
      quantidade: big(1),
      rule_id: "eletrica.quadro",
    },
    {
      codigo_sinapi: "91296",
      descricao_local: `Pontos elétricos (${principais} amb. principais + ${servico} áreas de serviço)`,
      unidade: "un",
      quantidade: big(pontos),
      rule_id: "eletrica.pontos",
    },
  ];
};

const ruleHidraulica: Rule = (p) => {
  const items: RuleItem[] = [];
  const banheiros = contarPorTipo(p.ambientes, ["banheiro", "lavabo"]);
  const cozinhas = contarPorTipo(p.ambientes, ["cozinha"]);
  const areaServ = contarPorTipo(p.ambientes, ["area_servico"]);
  // Pontos de água fria: 3 por banheiro (chuveiro + lavatório + vaso), 2 por cozinha, 2 por área
  const pontosAgua = banheiros * 3 + cozinhas * 2 + areaServ * 2;
  // Pontos de esgoto: 3 por banheiro, 1 por cozinha, 2 por área
  const pontosEsgoto = banheiros * 3 + cozinhas * 1 + areaServ * 2;

  items.push({
    codigo_sinapi: "89711",
    descricao_local: "Caixa d'água 1000L instalada",
    unidade: "un",
    quantidade: big(1),
    rule_id: "hidraulica.caixa",
  });
  if (pontosAgua > 0) {
    items.push({
      codigo_sinapi: "89351",
      descricao_local: `Pontos de água fria (${pontosAgua})`,
      unidade: "un",
      quantidade: big(pontosAgua),
      rule_id: "hidraulica.pontos-agua",
    });
  }
  if (pontosEsgoto > 0) {
    items.push({
      codigo_sinapi: "89352",
      descricao_local: `Pontos de esgoto (${pontosEsgoto})`,
      unidade: "un",
      quantidade: big(pontosEsgoto),
      rule_id: "hidraulica.pontos-esgoto",
    });
  }
  return items;
};

const ruleLoucasMetais: Rule = (p) => {
  const items: RuleItem[] = [];
  const banheiros = contarPorTipo(p.ambientes, ["banheiro", "lavabo"]);
  const cozinhas = contarPorTipo(p.ambientes, ["cozinha"]);

  if (banheiros > 0) {
    items.push({
      codigo_sinapi: "86931",
      descricao_local: "Vaso sanitário c/ caixa acoplada",
      unidade: "un",
      quantidade: big(banheiros),
      rule_id: "loucas.vaso",
    });
    items.push({
      codigo_sinapi: "86877",
      descricao_local: "Lavatório de louça com coluna",
      unidade: "un",
      quantidade: big(banheiros),
      rule_id: "loucas.lavatorio",
    });
  }
  if (cozinhas > 0) {
    items.push({
      codigo_sinapi: "86905",
      descricao_local: "Pia de cozinha aço inox",
      unidade: "un",
      quantidade: big(cozinhas),
      rule_id: "loucas.pia",
    });
  }
  return items;
};

// =============================================================================
// Conjunto de regras + função principal
// =============================================================================

const RULES: Rule[] = [
  ruleFundacao,
  ruleAlvenaria,
  ruleCobertura,
  ruleEsquadrias,
  rulePisosRevestimentos,
  rulePintura,
  ruleEletrica,
  ruleHidraulica,
  ruleLoucasMetais,
];

/**
 * Aplica todas as regras e retorna a lista consolidada de itens para o orçamento.
 * Pure function — sem I/O. Os preços vêm separadamente do sinapi_compositions.
 */
export function applyRulesV1(planta: ExtractedPlanta): RuleItem[] {
  const items: RuleItem[] = [];
  for (const rule of RULES) {
    items.push(...rule(planta));
  }
  return items;
}
