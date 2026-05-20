/**
 * Memorial.ai — Regras de orçamento heurístico v3
 *
 * Sucede v2.ts corrigindo códigos SINAPI errados. A v2 usava códigos cuja
 * descrição oficial SINAPI não batia com o que o orçamento mostrava ao usuário
 * (ex.: 89800 = tubo PVC esgoto, mas chamávamos de "forro gesso"; 91173/91174
 * = fixação de tubos, mas chamávamos de "janela"; 87878 = chapisco, mas chamávamos
 * de "alvenaria"; etc).
 *
 * V3 usa apenas códigos modernos confirmados em catálogo SINAPI 2023-2025 AF.
 * Quando não há SINAPI 1:1, o item vem com `preco_unitario_custom` e
 * `origem='custom'`.
 *
 * Códigos validados nesta versão (UF=SP, 2026-05-01):
 *
 *   FUNDAÇÃO
 *   - 96523 — Escavação manual de bloco/sapata
 *   - 96619 — Lastro de concreto magro fck=15, 5cm
 *   - 94965 — Concreto fck=25 MPa preparo betoneira 400L
 *
 *   ALVENARIA / REVESTIMENTO ARGAMASSA
 *   - 103328 — Alvenaria vedação blocos cerâmicos 9x19x19 com betoneira
 *   - 87878  — Chapisco aplicado em alvenarias internas, 1:3 manual
 *   - 87905  — Chapisco fachada com betoneira 400L
 *   - 87529  — Massa única interna 20mm 1:2:8
 *   - 87530  — Reboco parede 2cm traço 1:6
 *
 *   COBERTURA
 *   - 94195  — Telhamento cerâmica encaixe portuguesa até 2 águas
 *   - 96109  — Forro placas de gesso residencial
 *
 *   ESQUADRIAS
 *   - 90845  — Kit porta madeira semi-oca pintura 80x210 padrão médio
 *   - 94573  — Janela alumínio correr 4 folhas 150x120 com bandeira
 *   - 94569  — Janela alumínio maxim-ar 60x80
 *
 *   PISOS / REVESTIMENTOS
 *   - 87622  — Contrapiso argamassa 1:4 manual 2cm aderido
 *   - 87248  — Revestimento cerâmico piso esmaltado 35x35
 *   - 87265  — Revestimento cerâmico parede esmaltado 20x20
 *
 *   PINTURA
 *   - 88485  — Fundo selador acrílico 1 demão
 *   - 88497  — Emassamento massa látex parede 2 demãos
 *   - 88489  — Pintura látex acrílica premium paredes 2 demãos
 *
 *   ELÉTRICA
 *   - 104473 — Composição paramétrica ponto iluminação interruptor simples
 *   - 104480 — Composição paramétrica ponto uso específico 2P+T 20A
 *
 *   HIDRÁULICA
 *   - 104660 — Conjunto pontos água fria banheiro
 *   - 104662 — Conjunto pontos água fria área serviço
 *
 *   LOUÇAS
 *   - 86931  — Vaso sanitário sifonado caixa acoplada
 *   - 86939  — Lavatório louça com coluna padrão popular
 *
 * V2 e V1 permanecem intactas para reprodutibilidade de orçamentos antigos.
 */

import Big from "big.js";
import type { Disciplina } from "@/lib/ai/prompts/_shared-extraction-schema";

// =============================================================================
// Tipos
// =============================================================================

export const RULES_VERSION_V3 = "v3" as const;

export type ExtractedPlantaV3 = {
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

export type RuleItemV3 = {
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

function contarPorTipo(ambientes: ExtractedPlantaV3["ambientes"], tipos: string[]): number {
  return ambientes.filter((a) => tipos.includes(a.tipo)).length;
}

function big(n: number): Big {
  return new Big(n.toFixed(4));
}

function fatorPadraoAcabamento(p: ExtractedPlantaV3["padrao_construtivo"]): number {
  switch (p) {
    case "luxo":
      return 2.5;
    case "alto":
      return 1.8;
    case "medio":
      return 1.4;
    case "popular":
    case null:
    default:
      return 1.0;
  }
}

function fatorPadraoEstrutura(p: ExtractedPlantaV3["padrao_construtivo"]): number {
  switch (p) {
    case "luxo":
      return 1.3;
    case "alto":
      return 1.2;
    case "medio":
      return 1.1;
    default:
      return 1.0;
  }
}

function pav(p: ExtractedPlantaV3): number {
  return Math.max(1, p.numero_pavimentos ?? 1);
}

// =============================================================================
// REGRAS
// =============================================================================

type Rule = (planta: ExtractedPlantaV3) => RuleItemV3[];

// ---------- Fundação ----------
const ruleFundacao: Rule = (p) => {
  const area = p.area_total_m2;
  if (!area || area <= 0) return [];
  const perim = perimetroExternoEstimado(area);
  const fEst = fatorPadraoEstrutura(p.padrao_construtivo);

  return [
    {
      codigo_sinapi: "96523",
      descricao_local: "Escavação manual de vala para sapata corrida",
      unidade: "m³",
      quantidade: big(perim * 0.4 * 0.6 * fEst),
      rule_id: "fundacao.escavacao",
    },
    {
      codigo_sinapi: "96619",
      descricao_local: "Lastro de concreto magro 5cm sob sapata",
      unidade: "m²",
      // Aproximação: faixa 40cm × perímetro
      quantidade: big(perim * 0.4 * fEst),
      rule_id: "fundacao.lastro",
    },
    {
      codigo_sinapi: "94965",
      descricao_local: "Concreto fck=25 MPa preparo em betoneira 400L (sapata + baldrame)",
      unidade: "m³",
      quantidade: big(perim * 0.4 * 0.3 * fEst),
      rule_id: "fundacao.concreto",
    },
    {
      codigo_sinapi: "custom-aco-ca50-10mm",
      descricao_local: "Armação de aço CA-50 10mm para fundação (corte + dobra + montagem)",
      unidade: "kg",
      quantidade: big(perim * 0.4 * 0.3 * 80 * fEst),
      preco_unitario_custom: big(16.5 * fEst), // R$16.50/kg padrão SP 2026
      rule_id: "fundacao.aco",
    },
  ];
};

// ---------- Estrutura superior (laje + pilares + vigas) ----------
const ruleEstruturaSuperior: Rule = (p) => {
  const area = p.area_total_m2;
  if (!area || area <= 0) return [];
  const pavimentos = pav(p);
  const padrao = p.padrao_construtivo;
  const padraoAlto = padrao === "alto" || padrao === "luxo";

  const lajes = pavimentos - 1 + (padraoAlto ? 1 : 0);
  if (lajes === 0) return [];

  const volumeConcretoLaje = area * 0.12 * lajes;
  const acoLaje = volumeConcretoLaje * 50;
  const volumePilarViga = area * 0.04 * pavimentos;
  const acoPilarViga = volumePilarViga * 100;

  const fEst = fatorPadraoEstrutura(padrao);

  return [
    {
      codigo_sinapi: "94965",
      descricao_local: `Concreto fck=25 MPa estrutura superior (laje + pilares + vigas, ${pavimentos} pav.)`,
      unidade: "m³",
      quantidade: big((volumeConcretoLaje + volumePilarViga) * fEst),
      rule_id: "estrutura.concreto",
    },
    {
      codigo_sinapi: "custom-aco-ca50-estrutura",
      descricao_local: "Armação de aço CA-50 para estrutura superior (laje + pilares + vigas)",
      unidade: "kg",
      quantidade: big((acoLaje + acoPilarViga) * fEst),
      preco_unitario_custom: big(16.5 * fEst),
      rule_id: "estrutura.aco",
    },
    {
      codigo_sinapi: "custom-formas-madeira",
      descricao_local: "Formas de madeira para laje/pilares/vigas",
      unidade: "m²",
      quantidade: big((volumeConcretoLaje + volumePilarViga) * 7),
      preco_unitario_custom: big(95 * fEst),
      rule_id: "estrutura.formas",
    },
  ];
};

// ---------- Alvenaria ----------
const ruleAlvenaria: Rule = (p) => {
  const area = p.area_total_m2;
  if (!area || area <= 0) return [];
  const pavimentos = pav(p);
  const perim = perimetroExternoEstimado(area);
  const fEst = fatorPadraoEstrutura(p.padrao_construtivo);

  const areaParedesExternas = perim * PE_DIREITO_M * pavimentos;
  const areaParedesInternas = area * FATOR_PAREDES_INTERNAS * PE_DIREITO_M * pavimentos;
  const areaParedesTotal = areaParedesExternas + areaParedesInternas;

  return [
    {
      codigo_sinapi: "103328",
      descricao_local: `Alvenaria de vedação blocos cerâmicos 9x19x19cm (${pavimentos} pav.)`,
      unidade: "m²",
      quantidade: big(areaParedesTotal * fEst),
      rule_id: "alvenaria.blocos",
    },
    {
      codigo_sinapi: "87878",
      descricao_local: "Chapisco em paredes internas (traço 1:3, manual)",
      unidade: "m²",
      quantidade: big(areaParedesInternas * 2 * fEst),
      rule_id: "alvenaria.chapisco-interno",
    },
    {
      codigo_sinapi: "87905",
      descricao_local: "Chapisco em paredes externas (traço 1:3, betoneira 400L)",
      unidade: "m²",
      quantidade: big(areaParedesExternas * fEst),
      rule_id: "alvenaria.chapisco-externo",
    },
    {
      codigo_sinapi: "87529",
      descricao_local: "Massa única interna 20mm (traço 1:2:8, betoneira)",
      unidade: "m²",
      quantidade: big((areaParedesInternas * 2 + areaParedesExternas) * fEst),
      rule_id: "alvenaria.massa-interna",
    },
    {
      codigo_sinapi: "87530",
      descricao_local: "Reboco externo 2cm (traço 1:6)",
      unidade: "m²",
      quantidade: big(areaParedesExternas * fEst),
      rule_id: "alvenaria.reboco-externo",
    },
  ];
};

// ---------- Cobertura ----------
const ruleCobertura: Rule = (p) => {
  const area = p.area_total_m2;
  if (!area || area <= 0) return [];
  const pavimentos = pav(p);
  const areaPavTopo = area / pavimentos;
  const areaCobertura = areaPavTopo * 1.15;
  const fAcab = fatorPadraoAcabamento(p.padrao_construtivo);

  return [
    {
      codigo_sinapi: "custom-estrutura-madeira-cobertura",
      descricao_local: "Estrutura de madeira para telhado cerâmico (tesouras + ripas + caibros)",
      unidade: "m²",
      quantidade: big(areaCobertura),
      preco_unitario_custom: big(135),
      rule_id: "cobertura.estrutura",
    },
    {
      codigo_sinapi: "94195",
      descricao_local: "Telhamento com telha cerâmica de encaixe portuguesa, 2 águas",
      unidade: "m²",
      quantidade: big(areaCobertura),
      rule_id: "cobertura.telhas",
    },
    {
      codigo_sinapi: "96109",
      descricao_local: "Forro em placas de gesso (ambientes residenciais)",
      unidade: "m²",
      quantidade: big(area * 0.9 * fAcab),
      rule_id: "cobertura.forro",
    },
  ];
};

// ---------- Esquadrias ----------
const ruleEsquadrias: Rule = (p) => {
  const items: RuleItemV3[] = [];
  const ambientes = p.ambientes;
  const fAcab = fatorPadraoAcabamento(p.padrao_construtivo);

  // Porta de entrada (custom — madeira maciça, não tem SINAPI 1:1 popular)
  items.push({
    codigo_sinapi: "custom-porta-entrada",
    descricao_local: "Porta de entrada de madeira maciça 90x210cm com batente e fechadura",
    unidade: "un",
    quantidade: big(1),
    preco_unitario_custom: big(1850 * fAcab),
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
      codigo_sinapi: "90845",
      descricao_local: `Kit porta de madeira semi-oca 80x210 padrão médio (${portasInternas} unidades)`,
      unidade: "un",
      quantidade: big(portasInternas * fAcab),
      rule_id: "esquadrias.portas-internas",
    });
  }

  const janelasGrandes = contarPorTipo(ambientes, ["quarto", "suite", "sala", "cozinha"]);
  const janelasPequenas = contarPorTipo(ambientes, ["banheiro", "lavabo", "area_servico"]);
  if (janelasGrandes > 0) {
    items.push({
      codigo_sinapi: "94573",
      descricao_local: "Janela alumínio correr 4 folhas 150x120 com bandeira",
      unidade: "un",
      quantidade: big(janelasGrandes * fAcab),
      rule_id: "esquadrias.janelas-grandes",
    });
  }
  if (janelasPequenas > 0) {
    items.push({
      codigo_sinapi: "94569",
      descricao_local: "Janela alumínio maxim-ar 60x80",
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

  const items: RuleItemV3[] = [
    {
      codigo_sinapi: "87622",
      descricao_local: "Contrapiso argamassa 1:4 manual 2cm aderido",
      unidade: "m²",
      quantidade: big(area),
      rule_id: "pisos.contrapiso",
    },
    {
      codigo_sinapi: "87248",
      descricao_local: "Revestimento cerâmico de piso esmaltado 35x35",
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
      codigo_sinapi: "87265",
      descricao_local: `Revestimento cerâmico paredes internas esmaltado 20x20 (${banheiros} banh. + ${cozinhas} cozinha/área)`,
      unidade: "m²",
      quantidade: big(areaRevPared * fAcab),
      rule_id: "pisos.revestimento-parede",
    });
  }

  return items;
};

// ---------- Acabamentos lineares ----------
const ruleAcabamentosLineares: Rule = (p) => {
  const area = p.area_total_m2;
  if (!area || area <= 0) return [];
  const items: RuleItemV3[] = [];
  const fAcab = fatorPadraoAcabamento(p.padrao_construtivo);

  const metragemRodape = area * 0.9;
  items.push({
    codigo_sinapi: "custom-rodape",
    descricao_local: "Rodapé cerâmico/madeira (fornecido e instalado)",
    unidade: "m",
    quantidade: big(metragemRodape),
    preco_unitario_custom: big(28 * fAcab),
    rule_id: "acabamentos.rodape",
  });

  const portasInternas = contarPorTipo(p.ambientes, [
    "quarto",
    "suite",
    "banheiro",
    "lavabo",
    "escritorio",
    "deposito",
  ]);
  const totalPortas = portasInternas + 1;
  if (totalPortas > 0) {
    items.push({
      codigo_sinapi: "custom-soleira",
      descricao_local: `Soleiras de granito (${totalPortas} portas)`,
      unidade: "un",
      quantidade: big(totalPortas),
      preco_unitario_custom: big(95 * fAcab),
      rule_id: "acabamentos.soleira",
    });
  }

  const janelasGrandes = contarPorTipo(p.ambientes, ["quarto", "suite", "sala", "cozinha"]);
  const janelasPequenas = contarPorTipo(p.ambientes, ["banheiro", "lavabo", "area_servico"]);
  const totalJanelas = janelasGrandes + janelasPequenas;
  if (totalJanelas > 0) {
    items.push({
      codigo_sinapi: "custom-peitoril",
      descricao_local: `Peitoris de granito (${totalJanelas} janelas)`,
      unidade: "un",
      quantidade: big(totalJanelas),
      preco_unitario_custom: big(125 * fAcab),
      rule_id: "acabamentos.peitoril",
    });
  }

  return items;
};

// ---------- Bancadas ----------
const ruleBancadas: Rule = (p) => {
  const items: RuleItemV3[] = [];
  const banheiros = contarPorTipo(p.ambientes, ["banheiro", "lavabo"]);
  const cozinhas = contarPorTipo(p.ambientes, ["cozinha"]);
  const fAcab = fatorPadraoAcabamento(p.padrao_construtivo);

  if (cozinhas > 0) {
    const m2 = cozinhas * 2.5 * 0.6;
    items.push({
      codigo_sinapi: "custom-bancada-cozinha",
      descricao_local: `Bancada de granito cozinha (${cozinhas})`,
      unidade: "m²",
      quantidade: big(m2),
      preco_unitario_custom: big(720 * fAcab),
      rule_id: "bancadas.cozinha",
    });
  }
  if (banheiros > 0) {
    const m2 = banheiros * 1.5 * 0.55;
    items.push({
      codigo_sinapi: "custom-bancada-banheiro",
      descricao_local: `Bancada de granito banheiro (${banheiros})`,
      unidade: "m²",
      quantidade: big(m2),
      preco_unitario_custom: big(680 * fAcab),
      rule_id: "bancadas.banheiro",
    });
  }
  return items;
};

// ---------- Pintura ----------
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
      codigo_sinapi: "88485",
      descricao_local: "Fundo selador acrílico 1 demão (paredes internas)",
      unidade: "m²",
      quantidade: big(areaPinturaInt * fAcab),
      rule_id: "pintura.selador",
    },
    {
      codigo_sinapi: "88497",
      descricao_local: "Emassamento com massa látex em parede, 2 demãos, lixamento manual",
      unidade: "m²",
      quantidade: big(areaPinturaInt * fAcab),
      rule_id: "pintura.massa",
    },
    {
      codigo_sinapi: "88489",
      descricao_local: "Pintura látex acrílica paredes internas, 2 demãos",
      unidade: "m²",
      quantidade: big(areaPinturaInt * fAcab),
      rule_id: "pintura.interna",
    },
    {
      codigo_sinapi: "88489",
      descricao_local: "Pintura látex acrílica paredes externas, 2 demãos",
      unidade: "m²",
      quantidade: big(areaParedesExt * fAcab),
      rule_id: "pintura.externa",
    },
  ];
};

// ---------- Elétrica ----------
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
  // Pontos de iluminação: ~3 por ambiente principal + 2 por serviço
  const pontosIluminacao = principais * 3 + servico * 2;
  // Pontos de tomada/uso específico: ~5 por ambiente principal + 2 por serviço
  const pontosTomada = principais * 5 + servico * 2;

  return [
    {
      codigo_sinapi: "custom-quadro-distribuicao",
      descricao_local: `Quadro de distribuição 12 disjuntores com disjuntor geral (${pavimentos} pav.)`,
      unidade: "un",
      quantidade: big(pavimentos),
      preco_unitario_custom: big(620),
      rule_id: "eletrica.quadro",
    },
    {
      codigo_sinapi: "104473",
      descricao_local: `Ponto elétrico de iluminação com interruptor simples (${pontosIluminacao} pontos)`,
      unidade: "un",
      quantidade: big(pontosIluminacao),
      rule_id: "eletrica.pontos-iluminacao",
    },
    {
      codigo_sinapi: "104480",
      descricao_local: `Ponto elétrico de uso específico 2P+T 20A (${pontosTomada} pontos)`,
      unidade: "un",
      quantidade: big(pontosTomada),
      rule_id: "eletrica.pontos-tomada",
    },
  ];
};

// ---------- Hidráulica ----------
const ruleHidraulica: Rule = (p) => {
  const items: RuleItemV3[] = [];
  const banheiros = contarPorTipo(p.ambientes, ["banheiro", "lavabo"]);
  const cozinhas = contarPorTipo(p.ambientes, ["cozinha"]);
  const areaServ = contarPorTipo(p.ambientes, ["area_servico"]);

  items.push({
    codigo_sinapi: "custom-caixa-agua-1000",
    descricao_local: "Caixa d'água polietileno 1000L com tampa, instalada",
    unidade: "un",
    quantidade: big(1),
    preco_unitario_custom: big(1080),
    rule_id: "hidraulica.caixa",
  });

  if (banheiros > 0) {
    items.push({
      codigo_sinapi: "104660",
      descricao_local: `Conjunto pontos hidráulicos água fria banheiro (${banheiros})`,
      unidade: "un",
      quantidade: big(banheiros),
      rule_id: "hidraulica.banheiro",
    });
  }
  if (cozinhas > 0) {
    items.push({
      codigo_sinapi: "custom-pontos-cozinha",
      descricao_local: `Conjunto pontos hidráulicos cozinha (${cozinhas})`,
      unidade: "un",
      quantidade: big(cozinhas),
      preco_unitario_custom: big(1150),
      rule_id: "hidraulica.cozinha",
    });
  }
  if (areaServ > 0) {
    items.push({
      codigo_sinapi: "104662",
      descricao_local: `Conjunto pontos hidráulicos água fria área de serviço (${areaServ})`,
      unidade: "un",
      quantidade: big(areaServ),
      rule_id: "hidraulica.area-servico",
    });
  }
  // Esgoto: 1 conjunto por ambiente molhado
  const ambientesEsgoto = banheiros + cozinhas + areaServ;
  if (ambientesEsgoto > 0) {
    items.push({
      codigo_sinapi: "custom-pontos-esgoto",
      descricao_local: `Conjunto pontos de esgoto PVC (${ambientesEsgoto} ambientes)`,
      unidade: "un",
      quantidade: big(ambientesEsgoto),
      preco_unitario_custom: big(380),
      rule_id: "hidraulica.esgoto",
    });
  }
  return items;
};

// ---------- Louças e metais ----------
const ruleLoucasMetais: Rule = (p) => {
  const items: RuleItemV3[] = [];
  const banheiros = contarPorTipo(p.ambientes, ["banheiro", "lavabo"]);
  const cozinhas = contarPorTipo(p.ambientes, ["cozinha"]);
  const fAcab = fatorPadraoAcabamento(p.padrao_construtivo);

  if (banheiros > 0) {
    items.push({
      codigo_sinapi: "86931",
      descricao_local: "Vaso sanitário sifonado com caixa acoplada + engate flexível",
      unidade: "un",
      quantidade: big(banheiros * fAcab),
      rule_id: "loucas.vaso",
    });
    items.push({
      codigo_sinapi: "86939",
      descricao_local: "Lavatório de louça branca com coluna, padrão popular",
      unidade: "un",
      quantidade: big(banheiros * fAcab),
      rule_id: "loucas.lavatorio",
    });
  }
  if (cozinhas > 0) {
    items.push({
      codigo_sinapi: "custom-pia-cozinha",
      descricao_local: `Pia de cozinha aço inox 1 cuba + torneira (${cozinhas})`,
      unidade: "un",
      quantidade: big(cozinhas * fAcab),
      preco_unitario_custom: big(725),
      rule_id: "loucas.pia",
    });
  }
  return items;
};

// ---------- Elementos especiais ----------
const ruleElementosEspeciais: Rule = (p) => {
  const items: RuleItemV3[] = [];
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
      descricao_local: "Churrasqueira pré-moldada + coifa + área gourmet",
      unidade: "un",
      quantidade: big(1),
      preco_unitario_custom: big(12000 * fAcab),
      rule_id: "elementos.churrasqueira",
    });
  }
  if (e.garagem) {
    items.push({
      codigo_sinapi: "custom-garagem-cobertura",
      descricao_local: "Garagem coberta (estrutura metálica + telhamento)",
      unidade: "m²",
      quantidade: big(22),
      preco_unitario_custom: big(380),
      rule_id: "elementos.garagem",
    });
  }
  if (e.jardim) {
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

// ---------- Serviços preliminares ----------
const ruleServicosPreliminares: Rule = (p) => {
  const area = p.area_total_m2;
  if (!area || area <= 0) return [];
  return [
    {
      codigo_sinapi: "custom-locacao-obra",
      descricao_local: "Locação da obra + limpeza do terreno + nivelamento",
      unidade: "m²",
      quantidade: big(area),
      preco_unitario_custom: big(18),
      rule_id: "servicos.locacao",
    },
    {
      codigo_sinapi: "custom-canteiro",
      descricao_local: "Canteiro de obras + instalação provisória (água/luz/barraco)",
      unidade: "vb",
      quantidade: big(1),
      preco_unitario_custom: big(6500),
      rule_id: "servicos.canteiro",
    },
    {
      codigo_sinapi: "custom-art-alvara",
      descricao_local: "ART/RRT + alvará de construção + taxas municipais",
      unidade: "vb",
      quantidade: big(1),
      preco_unitario_custom: big(3500),
      rule_id: "servicos.art-alvara",
    },
  ];
};

// ---------- Limpeza final ----------
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

const RULES_V3: Rule[] = [
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

export function applyRulesV3(planta: ExtractedPlantaV3): RuleItemV3[] {
  const items: RuleItemV3[] = [];
  for (const rule of RULES_V3) {
    for (const item of rule(planta)) {
      items.push({ ...item, disciplina: "architectural" });
    }
  }
  return items;
}

// =============================================================================
// Sanity check CUB
// =============================================================================

const CUB_FAIXA: Record<
  NonNullable<ExtractedPlantaV3["padrao_construtivo"]>,
  { min: number; max: number }
> = {
  popular: { min: 1850, max: 2400 },
  medio: { min: 2300, max: 2900 },
  alto: { min: 3000, max: 4200 },
  luxo: { min: 4000, max: 6500 },
};

export function checkOrcamentoVsCubV3(
  total: number,
  area: number,
  padrao: ExtractedPlantaV3["padrao_construtivo"],
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
