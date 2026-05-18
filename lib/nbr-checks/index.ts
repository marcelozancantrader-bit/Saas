/**
 * Análise NBR básica (V0) — verificação heurística sobre a extração da
 * planta confirmada. NÃO substitui análise técnica do profissional.
 *
 * Regras avaliadas (V0):
 *   - NBR 9050:2020 — acessibilidade (largura mínima de circulação,
 *     porta mínima)
 *   - NBR 15575 / Código de Obras típico — iluminação natural mínima
 *     em dormitórios (1/6 da área)
 *   - Heurística — ventilação cruzada (mínimo 2 quartos com janela)
 *   - Heurística — banheiros com área mínima (1.5m²)
 *
 * Output: lista de findings com severidade (ok/warn/issue) e referência
 * normativa. Para uso na UI de revisão da extração.
 */

export type FindingSeverity = "ok" | "warn" | "issue";

export type NbrFinding = {
  id: string;
  ambiente?: string;
  severity: FindingSeverity;
  rule: string;
  message: string;
  reference: string;
};

export type ExtractionForCheck = {
  area_total_m2: number | null;
  numero_pavimentos: number | null;
  ambientes: Array<{ nome: string; area_m2: number | null; tipo: string }>;
};

const BANHEIRO_TIPOS = ["banheiro", "lavabo", "suite_banheiro", "wc"];
const QUARTO_TIPOS = ["quarto", "suite", "dormitorio"];

export function runNbrChecks(extracao: ExtractionForCheck): NbrFinding[] {
  const findings: NbrFinding[] = [];

  // ----- Banheiros: área mínima recomendada 1.5m² -----
  const banheiros = extracao.ambientes.filter((a) =>
    BANHEIRO_TIPOS.some((t) => a.tipo.toLowerCase().includes(t)),
  );
  for (const b of banheiros) {
    if (b.area_m2 !== null && b.area_m2 < 1.5) {
      findings.push({
        id: `banheiro_minimo_${b.nome}`,
        ambiente: b.nome,
        severity: "issue",
        rule: "Área mínima de banheiro",
        message: `${b.nome} tem ${b.area_m2}m². Recomendado mínimo de 1.5m² para garantir acessibilidade do vaso + lavatório.`,
        reference: "Códigos de Obras municipais / NBR 9050",
      });
    } else if (b.area_m2 !== null && b.area_m2 >= 1.5 && b.area_m2 < 3.2) {
      findings.push({
        id: `banheiro_acessivel_${b.nome}`,
        ambiente: b.nome,
        severity: "warn",
        rule: "Banheiro acessível PCD",
        message: `${b.nome} tem ${b.area_m2}m². Banheiro adaptado PCD exige círculo de manobra Ø1.50m, área mínima recomendada 3.2m² (NBR 9050:2020 §9.2). Pelo menos um banheiro por pavimento acessível em multifamiliar.`,
        reference: "NBR 9050:2020 §9.2",
      });
    }
  }

  // ----- Quartos: área mínima recomendada -----
  const quartos = extracao.ambientes.filter((a) =>
    QUARTO_TIPOS.some((t) => a.tipo.toLowerCase().includes(t)),
  );
  for (const q of quartos) {
    if (q.area_m2 !== null && q.area_m2 < 7) {
      findings.push({
        id: `quarto_minimo_${q.nome}`,
        ambiente: q.nome,
        severity: "issue",
        rule: "Área mínima de dormitório",
        message: `${q.nome} tem ${q.area_m2}m². A maioria dos códigos municipais exige mínimo 7m² para dormitório com 1 cama, 9m² para 2 camas.`,
        reference: "Código de Obras municipal típico",
      });
    }
  }

  // ----- Sala estar/jantar: área mínima -----
  const sala = extracao.ambientes.find((a) =>
    ["sala", "estar"].some((t) => a.tipo.toLowerCase().includes(t)),
  );
  if (sala && sala.area_m2 !== null && sala.area_m2 < 10) {
    findings.push({
      id: `sala_minima`,
      ambiente: sala.nome,
      severity: "warn",
      rule: "Área de sala",
      message: `Sala com ${sala.area_m2}m². Recomendado mínimo 10m² para conforto em residências (sala + jantar combinados).`,
      reference: "Códigos de Obras / boas práticas",
    });
  }

  // ----- Cozinha: área mínima -----
  const cozinha = extracao.ambientes.find((a) => a.tipo.toLowerCase().includes("cozinha"));
  if (cozinha && cozinha.area_m2 !== null && cozinha.area_m2 < 4.5) {
    findings.push({
      id: `cozinha_minima`,
      ambiente: cozinha.nome,
      severity: "issue",
      rule: "Área mínima de cozinha",
      message: `${cozinha.nome} tem ${cozinha.area_m2}m². Mínimo prático para abrigar fogão + pia + geladeira: 4.5m² (códigos de obras tipicamente exigem).`,
      reference: "Código de Obras municipal típico",
    });
  }

  // ----- Estimativa de iluminação natural (heurística) -----
  // 1/6 da área de piso em dormitórios e salas de permanência prolongada (NBR 15575).
  // Como não temos planilha de janelas, alertamos por área total
  for (const q of quartos) {
    if (q.area_m2 !== null && q.area_m2 >= 7) {
      const janela_minima = Math.ceil((q.area_m2 / 6) * 100) / 100;
      findings.push({
        id: `iluminacao_${q.nome}`,
        ambiente: q.nome,
        severity: "warn",
        rule: "Iluminação natural mínima",
        message: `${q.nome} (${q.area_m2}m²): janela útil mínima recomendada de ${janela_minima}m² (1/6 da área de piso). Confirmar no projeto executivo.`,
        reference: "NBR 15575-4 §13.4 / códigos municipais",
      });
    }
  }

  // ----- Circulação acessível PCD (NBR 9050) -----
  findings.push({
    id: `circulacao_pcd_global`,
    severity: "warn",
    rule: "Largura mínima de circulação",
    message:
      "Verifique se TODAS as circulações têm pelo menos 90cm (uso esporádico), idealmente 120cm (uso comum). Para PCD em cadeira: corredores 120cm + área de manobra Ø1.50m em pontos de mudança de direção.",
    reference: "NBR 9050:2020 §6.10, 9.8",
  });

  findings.push({
    id: `porta_acessivel`,
    severity: "warn",
    rule: "Vão livre de portas",
    message:
      "Portas internas: vão livre mínimo 80cm; banheiros e quartos acessíveis: vão livre 90cm. Não esquecer puxador horizontal entre 80-100cm do piso.",
    reference: "NBR 9050:2020 §6.11",
  });

  // ----- Ventilação cruzada (heurística) -----
  if (quartos.length > 0) {
    findings.push({
      id: `ventilacao_cruzada`,
      severity: "warn",
      rule: "Ventilação cruzada",
      message: `Confirme que cada um dos ${quartos.length} dormitório${quartos.length > 1 ? "s" : ""} tem pelo menos 1 janela em parede oposta à porta ou em parede adjacente para permitir ventilação cruzada (NBR 15575-4 e códigos sanitários).`,
      reference: "NBR 15575-4 §13.5",
    });
  }

  // ----- Totalizador -----
  if (findings.filter((f) => f.severity === "issue").length === 0 && findings.length > 0) {
    findings.unshift({
      id: "ok_summary",
      severity: "ok",
      rule: "Análise inicial OK",
      message:
        "Nenhum problema crítico de dimensão mínima detectado. Os avisos abaixo são pontos a confirmar no projeto executivo.",
      reference: "Memorial.ai",
    });
  }

  return findings;
}
