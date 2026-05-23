/**
 * Classificador heurístico de famílias de orçamento.
 *
 * Mapeia um item do orçamento (descrição + disciplina) numa família que
 * faça sentido enviar pra UM fornecedor (um fornecedor de alvenaria
 * cotará tijolo + argamassa + chapisco juntos; um de esquadrias cotará
 * porta + janela + caixilho).
 *
 * Estratégia:
 *  - Se a disciplina já é específica (electrical / hydraulic / structural
 *    / gas / hvac), retorna a família correspondente.
 *  - Senão (architectural), usa regex/keyword na descrição pra inferir
 *    uma das 9 famílias arquitetônicas mais comuns.
 *  - Fallback: "Diversos".
 *
 * NÃO é exata — fornecedor sempre pode reagrupar manualmente após
 * receber o PDF. O objetivo é dar 80% certo pra reduzir trabalho.
 */

import type { Disciplina } from "@/lib/ai/prompts/_shared-extraction-schema";

export type Familia =
  | "alvenaria_estrutura"
  | "cobertura"
  | "esquadrias"
  | "pisos_revestimentos"
  | "pintura"
  | "louças_metais"
  | "eletrica"
  | "hidraulica"
  | "gas"
  | "ar_condicionado"
  | "estrutural"
  | "impermeabilizacao"
  | "diversos";

export const FAMILIA_LABEL: Record<Familia, string> = {
  alvenaria_estrutura: "Alvenaria e estrutura",
  cobertura: "Cobertura e telhado",
  esquadrias: "Esquadrias (portas e janelas)",
  pisos_revestimentos: "Pisos e revestimentos",
  pintura: "Pintura",
  louças_metais: "Louças e metais",
  eletrica: "Instalação elétrica",
  hidraulica: "Instalação hidráulica",
  gas: "Instalação de gás",
  ar_condicionado: "Ar condicionado / HVAC",
  estrutural: "Concreto armado e aço",
  impermeabilizacao: "Impermeabilização",
  diversos: "Diversos",
};

/** Ordem canônica das famílias no PDF de cotação. */
export const FAMILIA_ORDER: Familia[] = [
  "alvenaria_estrutura",
  "estrutural",
  "cobertura",
  "esquadrias",
  "impermeabilizacao",
  "pisos_revestimentos",
  "louças_metais",
  "pintura",
  "hidraulica",
  "eletrica",
  "gas",
  "ar_condicionado",
  "diversos",
];

const KEYWORDS_BY_FAMILIA: Array<{
  familia: Familia;
  patterns: RegExp[];
}> = [
  {
    familia: "cobertura",
    patterns: [/\b(telha|telhado|cumeeira|rufo|calha|laje impermeab)/i, /\bcobertura\b/i],
  },
  {
    familia: "esquadrias",
    patterns: [
      /\b(porta|janela|caixilho|veneziana|esquadria|batente|maçaneta|fechadura|dobradi(ç|c)a)/i,
    ],
  },
  {
    familia: "impermeabilizacao",
    patterns: [/\b(impermeabiliz|manta asfalt|hidro\s*assfalt)/i],
  },
  {
    familia: "pisos_revestimentos",
    patterns: [
      /\b(piso|porcelanato|cerâmic|ladrilho|granit|mármore|quartzo|rodapé|azulejo|revestimento)/i,
    ],
  },
  {
    familia: "louças_metais",
    patterns: [/\b(vaso sanit|bacia|lavatório|cuba|torneira|chuveiro|ducha|misturador|registro)/i],
  },
  {
    familia: "pintura",
    patterns: [/\b(tinta|massa corrida|selador|primer|verniz|emassamento|pintura)/i],
  },
  {
    familia: "alvenaria_estrutura",
    patterns: [
      /\b(alvenaria|tijolo|bloco cer|argamassa|chapisco|emboço|reboco|fundação|sapata|baldrame|cinta)/i,
    ],
  },
  {
    familia: "estrutural",
    patterns: [
      /\b(concreto|aço CA-50|aço CA-60|vergalhão|laje (?:maciça|nervurada|treliçada)|pilar|viga)/i,
    ],
  },
  {
    familia: "hidraulica",
    patterns: [
      /\b(PVC|tubo|conexão|registro|caixa d'água|reservatório|hidrômetro|esgoto|pluvial|ralo|sifão|hidrossanit|hidrául)/i,
    ],
  },
  {
    familia: "eletrica",
    patterns: [
      /\b(elétric|fio|cabo|disjuntor|tomada|interruptor|quadro|circuito|condulete|eletroduto|luminár|lâmpada)/i,
    ],
  },
  {
    familia: "gas",
    patterns: [/\b(gás|GLP|registro de gás|GN)\b/i],
  },
  {
    familia: "ar_condicionado",
    patterns: [/\b(ar[- ]condicionado|split|HVAC|VRF|condensador|evaporador|chiller|fancoil)/i],
  },
];

const DISCIPLINA_TO_FAMILIA: Partial<Record<Disciplina, Familia>> = {
  electrical: "eletrica",
  hydraulic: "hidraulica",
  structural: "estrutural",
  gas: "gas",
  hvac: "ar_condicionado",
};

export function classifyFamilia(input: {
  descricao: string;
  disciplina: Disciplina | string | null;
}): Familia {
  // 1) Disciplinas específicas mapeiam direto
  const disc = input.disciplina as Disciplina | null;
  if (disc && disc !== "architectural" && DISCIPLINA_TO_FAMILIA[disc]) {
    return DISCIPLINA_TO_FAMILIA[disc] as Familia;
  }

  // 2) Architectural / unknown — inferir pela descrição
  const desc = input.descricao ?? "";
  for (const { familia, patterns } of KEYWORDS_BY_FAMILIA) {
    if (patterns.some((p) => p.test(desc))) return familia;
  }
  return "diversos";
}
