/**
 * Memorial.ai — Regras de orçamento heurístico v2
 *
 * Sucede v1.ts com cobertura ampliada e ajustes pra reduzir subestimativa.
 * V1 estava saindo ~50% abaixo do orçamento real (engenheiro disse R$250-300k pra
 * 130m² popular, sistema deu R$138k). Causas principais:
 *
 *   1. Estrutura superior ausente (laje + pilares + vigas)
 *   2. Multi-pavimento ignorado (sobrado calculado como térrea)
 *   3. Padrão construtivo não modulava preço
 *   4. Acabamentos lineares faltando (rodapés, soleiras, peitoris, bancadas)
 *   5. Serviços preliminares + limpeza final ausentes
 *   6. Elementos especiais (piscina, garagem, churrasqueira, paisagismo) ignorados
 *
 * V2 trata todos os pontos. V1 continua disponível pra reprodutibilidade de
 * orçamentos antigos — NUNCA sobrescrever.
 *
 * Itens custom (sem SINAPI direto) vêm com `preco_unitario_custom` setado e
 * `origem='custom'` é gravado em budget_items na hora de inserir.
 */

import Big from "big.js";
import type { Disciplina } from "@/lib/ai/prompts/_shared-extraction-schema";

// =============================================================================
// Tipos (compatíveis com v1, com `preco_unitario_custom` adicional)
// =============================================================================

export const RULES_VERSION_V2 = "v2" as const;

export type ExtractedPlantaV2 = {
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

export type RuleItemV2 = {
  codigo_sinapi: string;
  descricao_local: string;
  unidade: string;
  quantidade: Big;
  rule_id: string;
  disciplina?: Disciplina;
  /** Quando definido, bypassa lookup SINAPI — usa preço direto + origem='custom'. */
  preco_unitario_custom?: Big;
};

// =============================================================================
// Heurísticas auxiliares
// =============================================================================

const PE_DIREITO_M = 2.8;
const FATOR_PAREDES_INTERNAS = 0.45;

function perimetroExternoEstimado(areaM2: number): number {
  return 3.5 * Math.sqrt(areaM2 / 0.75);
}

function contarPorTipo(ambientes: ExtractedPlantaV2["ambientes"], tipos: string[]): number {
  return ambientes.filter((a) => tipos.includes(a.tipo)).length;
}

function big(n: number): Big {
  return new Big(n.toFixed(4));
}

/**
 * Fator multiplicador para acabamentos por padrão construtivo.
 * Popular/médio = 1.0 (preços SINAPI já refletem padrão médio).
 * Alto = 1.5, Luxo = 2.2 (porcelanato, granito premium, esquadrias importadas).
 */
function fatorPadraoAcabamento(p: ExtractedPlantaV2["padrao_construtivo"]): number {
  switch (p) {
    case "luxo":
      return 2.2;
    case "alto":
      return 1.5;
    case "popular":
    case "medio":
    case null:
    default:
      return 1.0;
  }
}

/**
 * Fator multiplicador para estrutura/obra bruta por padrão construtivo.
 * Mais conservador que o de acabamento — estrutura varia menos.
 */
function fatorPadraoEstrutura(p: ExtractedPlantaV2["padrao_construtivo"]): number {
  switch (p) {
    case "luxo":
      return 1.2;
    case "alto":
      return 1.1;
    default:
      return 1.0;
  }
}

/** Número de pavimentos com fallback (1) */
function pav(p: ExtractedPlantaV2): number {
  return Math.max(1, p.numero_pavimentos ?? 1);
}

// =============================================================================
// REGRAS — cada função retorna 0+ items
// =============================================================================

type Rule = (planta: ExtractedPlantaV2) => RuleItemV2[];

// ---------- Fundação ----------
const ruleFundacao: Rule = (p) => {
  const area = p.area_total_m2;
  if (!area || area <= 0) return [];
  // Fundação é só do térreo — não multiplica por pavimentos
  const perim = perimetroExternoEstimado(area);
  const fEst = fatorPadraoEstrutura(p.padrao_construtivo);

  return [
    {
      codigo_sinapi: "73964/001",
      descricao_local: "Escavação para sapata corrida",
      unidade: "m³",
      quantidade: big(perim * 0.4 * 0.6 * fEst),
      rule_id: "fundacao.escavacao",
    },
    {
      codigo_sinapi: "74157/004",
      descricao_local: "Concreto magro de regularização",
      unidade: "m³",
      quantidade: big(perim * 0.4 * 0.05 * fEst),
      rule_id: "fundacao.concreto-magro",
    },
    {
      codigo_sinapi: "92873",
      descricao_local: "Concreto fck=25 MPa (sapata + cinta de baldrame)",
      unidade: "m³",
      quantidade: big(perim * 0.4 * 0.3 * fEst),
      rule_id: "fundacao.concreto-25",
    },
    {
      codigo_sinapi: "92775",
      descricao_local: "Armadura CA-50 para fundação",
      unidade: "kg",
      quantidade: big(perim * 0.4 * 0.3 * 80 * fEst),
      rule_id: "fundacao.aco",
    },
  ];
};

// ---------- Estrutura superior (laje + pilares + vigas) — NOVO ----------
// Aplicada quando pavimentos > 1 (sobrado, precisa de laje entre andares)
// ou quando padrão construtivo é alto/luxo (laje sob cobertura é comum)
const ruleEstruturaSuperior: Rule = (p) => {
  const area = p.area_total_m2;
  if (!area || area <= 0) return [];
  const pavimentos = pav(p);
  const padrao = p.padrao_construtivo;
  const padraoAlto = padrao === "alto" || padrao === "luxo";

  // Lajes entre andares: (pavimentos - 1) lajes
  // Mais 1 laje sob cobertura se padrão alto+
  const lajes = pavimentos - 1 + (padraoAlto ? 1 : 0);
  if (lajes === 0) return [];

  // Por laje: 12cm espessura (0.12 m³/m²), ~50 kg/m³ de aço
  const volumeConcretoLaje = area * 0.12 * lajes;
  const acoLaje = volumeConcretoLaje * 50;
  // Pilares e vigas: ~0.04 m³/m² de obra, 100 kg/m³ de aço
  const volumePilarViga = area * 0.04 * pavimentos;
  const acoPilarViga = volumePilarViga * 100;

  const fEst = fatorPadraoEstrutura(padrao);

  return [
    {
      codigo_sinapi: "92873",
      descricao_local: `Concreto fck=25 MPa (laje + pilares + vigas, ${pavimentos} pav.)`,
      unidade: "m³",
      quantidade: big((volumeConcretoLaje + volumePilarViga) * fEst),
      rule_id: "estrutura.concreto",
    },
    {
      codigo_sinapi: "92775",
      descricao_local: "Armadura CA-50 para estrutura superior",
      unidade: "kg",
      quantidade: big((acoLaje + acoPilarViga) * fEst),
      rule_id: "estrutura.aco",
    },
    // Formas de madeira para concretagem (custom — composição própria simplificada)
    {
      codigo_sinapi: "custom-formas-madeira",
      descricao_local: "Formas de madeira para laje/pilares/vigas",
      unidade: "m²",
      // ~7 m² de forma por m³ de concreto
      quantidade: big((volumeConcretoLaje + volumePilarViga) * 7),
      preco_unitario_custom: big(95 * fEst), // R$95/m² padrão médio SP 2026
      rule_id: "estrutura.formas",
    },
  ];
};

// ---------- Alvenaria (× pavimentos) ----------
const ruleAlvenaria: Rule = (p) => {
  const area = p.area_total_m2;
  if (!area || area <= 0) return [];
  const pavimentos = pav(p);
  const perim = perimetroExternoEstimado(area);
  const fEst = fatorPadraoEstrutura(p.padrao_construtivo);

  // Paredes externas: perímetro × PE × pavimentos
  // Paredes internas: fator × área × PE × pavimentos
  const areaParedesExternas = perim * PE_DIREITO_M * pavimentos;
  const areaParedesInternas = area * FATOR_PAREDES_INTERNAS * PE_DIREITO_M * pavimentos;
  const areaParedesTotal = areaParedesExternas + areaParedesInternas;

  return [
    {
      codigo_sinapi: "87878",
      descricao_local: `Alvenaria de blocos cerâmicos (${pavimentos} pav.)`,
      unidade: "m²",
      quantidade: big(areaParedesTotal * fEst),
      rule_id: "alvenaria.blocos",
    },
    {
      codigo_sinapi: "87559",
      descricao_local: "Chapisco em paredes (interno + externo)",
      unidade: "m²",
      quantidade: big(areaParedesTotal * 2 * fEst),
      rule_id: "alvenaria.chapisco",
    },
    {
      codigo_sinapi: "87529",
      descricao_local: "Emboço interno",
      unidade: "m²",
      quantidade: big((areaParedesInternas * 2 + areaParedesExternas) * fEst),
      rule_id: "alvenaria.emboco-interno",
    },
    {
      codigo_sinapi: "87530",
      descricao_local: "Emboço externo",
      unidade: "m²",
      quantidade: big(areaParedesExternas * fEst),
      rule_id: "alvenaria.emboco-externo",
    },
  ];
};

// ---------- Cobertura ----------
const ruleCobertura: Rule = (p) => {
  const area = p.area_total_m2;
  if (!area || area <= 0) return [];
  // Cobertura cobre só o último pavimento (área total / pavimentos × 1.15)
  // Mas se o usuário inseriu área_total como área construída total (de todos os pavs)
  // então a área da cobertura = area / pavimentos × 1.15
  const pavimentos = pav(p);
  const areaPavTopo = area / pavimentos;
  const areaCobertura = areaPavTopo * 1.15;
  const fAcab = fatorPadraoAcabamento(p.padrao_construtivo);

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
      // Forro em TODOS os pavimentos (cada andar tem forro)
      quantidade: big(area * 0.9 * fAcab),
      rule_id: "cobertura.forro",
    },
  ];
};

// ---------- Esquadrias (multiplica por pavimentos pro caso de janelas extras) ----------
const ruleEsquadrias: Rule = (p) => {
  const items: RuleItemV2[] = [];
  const ambientes = p.ambientes;
  const fAcab = fatorPadraoAcabamento(p.padrao_construtivo);

  // 1 porta de entrada (sempre 1)
  items.push({
    codigo_sinapi: "90445",
    descricao_local: "Porta de entrada",
    unidade: "un",
    quantidade: big(1 * fAcab),
    rule_id: "esquadrias.porta-entrada",
  });

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
      quantidade: big(portasInternas * fAcab),
      rule_id: "esquadrias.portas-internas",
    });
  }

  const janelasGrandes = contarPorTipo(ambientes, ["quarto", "suite", "sala", "cozinha"]);
  const janelasPequenas = contarPorTipo(ambientes, ["banheiro", "lavabo", "area_servico"]);
  if (janelasGrandes > 0) {
    items.push({
      codigo_sinapi: "91174",
      descricao_local: "Janelas de correr 150x120",
      unidade: "un",
      quantidade: big(janelasGrandes * fAcab),
      rule_id: "esquadrias.janelas-grandes",
    });
  }
  if (janelasPequenas > 0) {
    items.push({
      codigo_sinapi: "91173",
      descricao_local: "Janelas basculantes 60x60",
      unidade: "un",
      quantidade: big(janelasPequenas * fAcab),
      rule_id: "esquadrias.janelas-pequenas",
    });
  }

  return items;
};

// ---------- Pisos e revestimentos ----------
const rulePisosRevestimentos: Rule = (p) => {
  const area = p.area_total_m2;
  if (!area || area <= 0) return [];
  const fAcab = fatorPadraoAcabamento(p.padrao_construtivo);

  const items: RuleItemV2[] = [
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
      quantidade: big(area * 0.95 * fAcab),
      rule_id: "pisos.ceramico",
    },
  ];

  const banheiros = contarPorTipo(p.ambientes, ["banheiro", "lavabo"]);
  const cozinhas = contarPorTipo(p.ambientes, ["cozinha", "area_servico"]);
  const areaRevPared = banheiros * 25 + cozinhas * 15;
  if (areaRevPared > 0) {
    items.push({
      codigo_sinapi: "87527",
      descricao_local: `Revestimento cerâmico parede (${banheiros} banh. + ${cozinhas} cozinha/área)`,
      unidade: "m²",
      quantidade: big(areaRevPared * fAcab),
      rule_id: "pisos.revestimento-parede",
    });
  }

  return items;
};

// ---------- Acabamentos lineares: rodapés + soleiras + peitoris — NOVO ----------
const ruleAcabamentosLineares: Rule = (p) => {
  const area = p.area_total_m2;
  if (!area || area <= 0) return [];
  const items: RuleItemV2[] = [];
  const fAcab = fatorPadraoAcabamento(p.padrao_construtivo);

  // Rodapé: estimativa ~0.9m linear por m² de área (compensa portas)
  const metragemRodape = area * 0.9;
  items.push({
    codigo_sinapi: "custom-rodape",
    descricao_local: "Rodapé cerâmico/madeira (instalado)",
    unidade: "m",
    quantidade: big(metragemRodape),
    preco_unitario_custom: big(25 * fAcab), // R$25/m popular
    rule_id: "acabamentos.rodape",
  });

  // Soleiras: 1 por porta
  const portasInternas = contarPorTipo(p.ambientes, [
    "quarto",
    "suite",
    "banheiro",
    "lavabo",
    "escritorio",
    "deposito",
  ]);
  const totalPortas = portasInternas + 1; // +1 porta de entrada
  if (totalPortas > 0) {
    items.push({
      codigo_sinapi: "custom-soleira",
      descricao_local: `Soleiras de granito (${totalPortas} portas)`,
      unidade: "un",
      quantidade: big(totalPortas),
      preco_unitario_custom: big(85 * fAcab),
      rule_id: "acabamentos.soleira",
    });
  }

  // Peitoris: 1 por janela
  const janelasGrandes = contarPorTipo(p.ambientes, ["quarto", "suite", "sala", "cozinha"]);
  const janelasPequenas = contarPorTipo(p.ambientes, ["banheiro", "lavabo", "area_servico"]);
  const totalJanelas = janelasGrandes + janelasPequenas;
  if (totalJanelas > 0) {
    items.push({
      codigo_sinapi: "custom-peitoril",
      descricao_local: `Peitoris de granito (${totalJanelas} janelas)`,
      unidade: "un",
      quantidade: big(totalJanelas),
      preco_unitario_custom: big(110 * fAcab),
      rule_id: "acabamentos.peitoril",
    });
  }

  return items;
};

// ---------- Bancadas (cozinha + banheiros) — NOVO ----------
const ruleBancadas: Rule = (p) => {
  const items: RuleItemV2[] = [];
  const banheiros = contarPorTipo(p.ambientes, ["banheiro", "lavabo"]);
  const cozinhas = contarPorTipo(p.ambientes, ["cozinha"]);
  const fAcab = fatorPadraoAcabamento(p.padrao_construtivo);

  if (cozinhas > 0) {
    // 2.5m linear × 0.6m profundidade
    const m2 = cozinhas * 2.5 * 0.6;
    items.push({
      codigo_sinapi: "custom-bancada-cozinha",
      descricao_local: `Bancada de granito cozinha (${cozinhas})`,
      unidade: "m²",
      quantidade: big(m2),
      preco_unitario_custom: big(650 * fAcab),
      rule_id: "bancadas.cozinha",
    });
  }
  if (banheiros > 0) {
    // 1.5m linear × 0.55m profundidade
    const m2 = banheiros * 1.5 * 0.55;
    items.push({
      codigo_sinapi: "custom-bancada-banheiro",
      descricao_local: `Bancada de granito banheiro (${banheiros})`,
      unidade: "m²",
      quantidade: big(m2),
      preco_unitario_custom: big(620 * fAcab),
      rule_id: "bancadas.banheiro",
    });
  }
  return items;
};

// ---------- Pintura (× pavimentos) ----------
const rulePintura: Rule = (p) => {
  const area = p.area_total_m2;
  if (!area || area <= 0) return [];
  const pavimentos = pav(p);
  const perim = perimetroExternoEstimado(area);
  const areaParedesExt = perim * PE_DIREITO_M * pavimentos;
  const areaParedesInt = area * FATOR_PAREDES_INTERNAS * PE_DIREITO_M * pavimentos;
  const areaPinturaInt = areaParedesInt * 2 + areaParedesExt;
  const fAcab = fatorPadraoAcabamento(p.padrao_construtivo);

  return [
    {
      codigo_sinapi: "88488",
      descricao_local: "Massa corrida + lixamento (paredes internas)",
      unidade: "m²",
      quantidade: big(areaPinturaInt * fAcab),
      rule_id: "pintura.massa",
    },
    {
      codigo_sinapi: "88489",
      descricao_local: "Pintura PVA látex paredes internas",
      unidade: "m²",
      quantidade: big(areaPinturaInt * fAcab),
      rule_id: "pintura.interna",
    },
    {
      codigo_sinapi: "88500",
      descricao_local: "Pintura acrílica paredes externas",
      unidade: "m²",
      quantidade: big(areaParedesExt * fAcab),
      rule_id: "pintura.externa",
    },
  ];
};

// ---------- Elétrica (× pavimentos) ----------
const ruleEletrica: Rule = (p) => {
  const area = p.area_total_m2;
  if (!area || area <= 0) return [];
  const pavimentos = pav(p);
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
      descricao_local: `Quadro de distribuição (${pavimentos} pav.)`,
      unidade: "un",
      quantidade: big(pavimentos),
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

// ---------- Hidráulica ----------
const ruleHidraulica: Rule = (p) => {
  const items: RuleItemV2[] = [];
  const banheiros = contarPorTipo(p.ambientes, ["banheiro", "lavabo"]);
  const cozinhas = contarPorTipo(p.ambientes, ["cozinha"]);
  const areaServ = contarPorTipo(p.ambientes, ["area_servico"]);
  const pontosAgua = banheiros * 3 + cozinhas * 2 + areaServ * 2;
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

// ---------- Louças e metais ----------
const ruleLoucasMetais: Rule = (p) => {
  const items: RuleItemV2[] = [];
  const banheiros = contarPorTipo(p.ambientes, ["banheiro", "lavabo"]);
  const cozinhas = contarPorTipo(p.ambientes, ["cozinha"]);
  const fAcab = fatorPadraoAcabamento(p.padrao_construtivo);

  if (banheiros > 0) {
    items.push({
      codigo_sinapi: "86931",
      descricao_local: "Vaso sanitário c/ caixa acoplada",
      unidade: "un",
      quantidade: big(banheiros * fAcab),
      rule_id: "loucas.vaso",
    });
    items.push({
      codigo_sinapi: "86877",
      descricao_local: "Lavatório de louça com coluna",
      unidade: "un",
      quantidade: big(banheiros * fAcab),
      rule_id: "loucas.lavatorio",
    });
  }
  if (cozinhas > 0) {
    items.push({
      codigo_sinapi: "86905",
      descricao_local: "Pia de cozinha aço inox",
      unidade: "un",
      quantidade: big(cozinhas * fAcab),
      rule_id: "loucas.pia",
    });
  }
  return items;
};

// ---------- Elementos especiais (piscina, garagem, churrasq., paisagismo) — NOVO ----------
const ruleElementosEspeciais: Rule = (p) => {
  const items: RuleItemV2[] = [];
  const e = p.elementos_especiais;
  const fAcab = fatorPadraoAcabamento(p.padrao_construtivo);

  if (e.piscina) {
    items.push({
      codigo_sinapi: "custom-piscina",
      descricao_local: "Piscina de alvenaria 4x8m (estrutura + revestimento + casa de máquinas)",
      unidade: "un",
      quantidade: big(1),
      preco_unitario_custom: big(45000 * fAcab),
      rule_id: "elementos.piscina",
    });
  }
  if (e.churrasqueira) {
    items.push({
      codigo_sinapi: "custom-churrasqueira",
      descricao_local: "Churrasqueira pré-moldada + coifa + área gourmet (estrutura)",
      unidade: "un",
      quantidade: big(1),
      preco_unitario_custom: big(12000 * fAcab),
      rule_id: "elementos.churrasqueira",
    });
  }
  if (e.garagem) {
    // Garagem coberta — pé direito menor + estrutura leve
    items.push({
      codigo_sinapi: "custom-garagem-cobertura",
      descricao_local: "Garagem coberta (estrutura metálica + telhamento)",
      unidade: "m²",
      // Estimativa: 22m² (1 vaga) — pode ser ajustado manualmente depois
      quantidade: big(22),
      preco_unitario_custom: big(380),
      rule_id: "elementos.garagem",
    });
  }
  if (e.jardim) {
    // Paisagismo simples: grama + algumas mudas + irrigação básica
    items.push({
      codigo_sinapi: "custom-paisagismo",
      descricao_local: "Paisagismo e jardim (grama + mudas + irrigação básica)",
      unidade: "vb",
      quantidade: big(1),
      preco_unitario_custom: big(8500 * fAcab),
      rule_id: "elementos.paisagismo",
    });
  }
  return items;
};

// ---------- Serviços preliminares — NOVO ----------
const ruleServicosPreliminares: Rule = (p) => {
  const area = p.area_total_m2;
  if (!area || area <= 0) return [];
  const items: RuleItemV2[] = [];

  // Limpeza/locação do terreno: R$18/m² de área
  items.push({
    codigo_sinapi: "custom-locacao-obra",
    descricao_local: "Locação da obra + limpeza do terreno + nivelamento",
    unidade: "m²",
    quantidade: big(area),
    preco_unitario_custom: big(18),
    rule_id: "servicos.locacao",
  });

  // Canteiro de obras + instalação provisória (água, luz, barraco)
  items.push({
    codigo_sinapi: "custom-canteiro",
    descricao_local: "Canteiro de obras + instalação provisória (água/luz/barraco)",
    unidade: "vb",
    quantidade: big(1),
    preco_unitario_custom: big(6500),
    rule_id: "servicos.canteiro",
  });

  // ART/RRT + alvará + projetos complementares
  items.push({
    codigo_sinapi: "custom-art-alvara",
    descricao_local: "ART/RRT + alvará de construção + taxas",
    unidade: "vb",
    quantidade: big(1),
    preco_unitario_custom: big(3500),
    rule_id: "servicos.art-alvara",
  });

  return items;
};

// ---------- Limpeza final — NOVO ----------
const ruleLimpezaFinal: Rule = (p) => {
  const area = p.area_total_m2;
  if (!area || area <= 0) return [];
  return [
    {
      codigo_sinapi: "custom-limpeza-final",
      descricao_local: "Limpeza geral pós-obra",
      unidade: "m²",
      quantidade: big(area),
      preco_unitario_custom: big(12),
      rule_id: "servicos.limpeza-final",
    },
  ];
};

// =============================================================================
// Conjunto de regras + função principal
// =============================================================================

const RULES_V2: Rule[] = [
  ruleServicosPreliminares,
  ruleFundacao,
  ruleEstruturaSuperior,
  ruleAlvenaria,
  ruleCobertura,
  ruleEsquadrias,
  rulePisosRevestimentos,
  ruleAcabamentosLineares,
  ruleBancadas,
  rulePintura,
  ruleEletrica,
  ruleHidraulica,
  ruleLoucasMetais,
  ruleElementosEspeciais,
  ruleLimpezaFinal,
];

/**
 * Aplica todas as regras v2 e retorna a lista consolidada de itens.
 * Itens com `preco_unitario_custom` setado bypassam lookup SINAPI (origem='custom').
 */
export function applyRulesV2(planta: ExtractedPlantaV2): RuleItemV2[] {
  const items: RuleItemV2[] = [];
  for (const rule of RULES_V2) {
    for (const item of rule(planta)) {
      items.push({ ...item, disciplina: "architectural" });
    }
  }
  return items;
}

// =============================================================================
// Sanity check: CUB médio por padrão construtivo (warn no observações)
// =============================================================================

/**
 * Faixas de R$/m² de referência (CUB-SP/PR Q1/2026 estimado).
 * Usado pra detectar quando o orçamento está absurdamente abaixo/acima.
 */
const CUB_FAIXA: Record<
  NonNullable<ExtractedPlantaV2["padrao_construtivo"]>,
  { min: number; max: number }
> = {
  popular: { min: 1850, max: 2400 },
  medio: { min: 2300, max: 2900 },
  alto: { min: 3000, max: 4200 },
  luxo: { min: 4000, max: 6500 },
};

export function checkOrcamentoVsCub(
  total: number,
  area: number,
  padrao: ExtractedPlantaV2["padrao_construtivo"],
): { ok: boolean; ratio: number; faixa: { min: number; max: number } | null; msg?: string } {
  if (!area || area <= 0 || !padrao) {
    return { ok: true, ratio: 0, faixa: null };
  }
  const faixa = CUB_FAIXA[padrao];
  const porM2 = total / area;
  const ratio = porM2 / ((faixa.min + faixa.max) / 2);
  if (porM2 < faixa.min * 0.85) {
    return {
      ok: false,
      ratio,
      faixa,
      msg: `Orçamento R$${porM2.toFixed(0)}/m² está abaixo da faixa CUB ${padrao} (R$${faixa.min}-${faixa.max}/m²). Revise se há itens faltando.`,
    };
  }
  if (porM2 > faixa.max * 1.25) {
    return {
      ok: false,
      ratio,
      faixa,
      msg: `Orçamento R$${porM2.toFixed(0)}/m² está acima da faixa CUB ${padrao} (R$${faixa.min}-${faixa.max}/m²). Verifique quantitativos.`,
    };
  }
  return { ok: true, ratio, faixa };
}
