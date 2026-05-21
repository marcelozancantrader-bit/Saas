import { getZona, type ZoneamentoRule } from "./cidades";
import type { NbrFinding } from "@/lib/nbr-checks";

/**
 * Forma alternativa de ZoneamentoInput usando uma `rule` direta — útil pra
 * zoneamento custom (cidades fora da curadoria, vindo de meta.zoneamento_custom).
 */
export type RecuosMedidos = {
  /** Recuos efetivamente medidos em metros (do projeto executivo). */
  frontal_m?: number | null;
  lateral_direito_m?: number | null;
  lateral_esquerdo_m?: number | null;
  fundos_m?: number | null;
  /** Quando o user mediu/preencheu. Ajuda a auditar. */
  updated_at?: string | null;
};

export type ZoneamentoInputCustom = {
  rule: ZoneamentoRule & {
    cidade_nome?: string;
    uf?: string;
    lei?: string;
    fonte_url?: string | null;
    origem?: "manual" | "ia";
  };
  area_terreno_m2: number;
  area_construida_total_m2: number | null;
  numero_pavimentos: number | null;
  tem_garagem: boolean;
  recuos_medidos?: RecuosMedidos | null;
};

/** Aceita zoneamento custom — extrai a rule de meta.zoneamento_custom. */
export function runZoneamentoChecksCustom(input: ZoneamentoInputCustom): NbrFinding[] {
  const zona = input.rule;
  const findings: NbrFinding[] = [];
  const cidadeRef = input.rule.cidade_nome
    ? `${input.rule.cidade_nome}/${input.rule.uf ?? "??"}`
    : "custom";
  const ref = `${zona.label} (${cidadeRef})`;
  return appendFindings(findings, zona, input, ref);
}

function appendFindings(
  findings: NbrFinding[],
  zona: ZoneamentoRule,
  input: Omit<ZoneamentoInputCustom, "rule">,
  ref: string,
): NbrFinding[] {
  if (input.area_terreno_m2 > 0 && input.area_construida_total_m2 !== null) {
    const ca_calc = input.area_construida_total_m2 / input.area_terreno_m2;
    const ca_limite = zona.ca_maximo ?? zona.ca_basico;
    const caStatus = ca_calc <= zona.ca_basico ? "ok" : ca_calc <= ca_limite ? "warn" : "issue";
    findings.push({
      id: "zoneamento_ca",
      severity: caStatus,
      rule: "Coeficiente de aproveitamento (CA)",
      message: severityMessage(
        caStatus,
        `${ca_calc.toFixed(2)} (${input.area_construida_total_m2}m² ÷ ${input.area_terreno_m2}m²) vs limite básico ${zona.ca_basico}` +
          (zona.ca_maximo && zona.ca_maximo !== zona.ca_basico
            ? ` / máximo c/ outorga ${zona.ca_maximo}`
            : ""),
      ),
      reference: ref,
    });

    if (input.numero_pavimentos && input.numero_pavimentos > 0) {
      const area_termina_aprox = input.area_construida_total_m2 / input.numero_pavimentos;
      const to_calc = (area_termina_aprox / input.area_terreno_m2) * 100;
      const toStatus = to_calc <= zona.to_max_pct ? "ok" : "issue";
      findings.push({
        id: "zoneamento_to",
        severity: toStatus,
        rule: "Taxa de ocupação (TO)",
        message: severityMessage(
          toStatus,
          `${to_calc.toFixed(1)}% (estimativa pavimento térreo ${area_termina_aprox.toFixed(0)}m² ÷ terreno ${input.area_terreno_m2}m²) vs máximo ${zona.to_max_pct}%`,
        ),
        reference: ref,
      });
    }
  } else if (input.area_terreno_m2 <= 0) {
    findings.push({
      id: "zoneamento_terreno_falta",
      severity: "warn",
      rule: "Área do terreno faltando",
      message: "Informe a área do terreno (lote) no projeto para validar TO e CA.",
      reference: ref,
    });
  }

  if (zona.altura_max_m !== null) {
    const altura_estimada = input.numero_pavimentos !== null ? input.numero_pavimentos * 3 : null;
    if (altura_estimada !== null) {
      const sev = altura_estimada <= zona.altura_max_m ? "ok" : "issue";
      findings.push({
        id: "zoneamento_altura",
        severity: sev,
        rule: "Altura máxima",
        message: severityMessage(
          sev,
          `~${altura_estimada}m estimado (${input.numero_pavimentos} pav × 3m) vs máximo ${zona.altura_max_m}m`,
        ),
        reference: ref,
      });
    } else {
      findings.push({
        id: "zoneamento_altura_unknown",
        severity: "warn",
        rule: "Altura máxima",
        message: `Limite da zona: ${zona.altura_max_m}m. Confirme se a edificação cabe (n. pavimentos não informado).`,
        reference: ref,
      });
    }
  }

  if (zona.vagas_por_unidade > 0) {
    findings.push({
      id: "zoneamento_vagas",
      severity: input.tem_garagem ? "ok" : "issue",
      rule: "Vagas de estacionamento",
      message: input.tem_garagem
        ? `Garagem presente — mínimo de ${zona.vagas_por_unidade} vaga(s) por unidade. Confirme nº de vagas reais.`
        : `Zona exige mínimo ${zona.vagas_por_unidade} vaga(s) por unidade. Garagem NÃO detectada na planta.`,
      reference: ref,
    });
  }

  // Recuos — se o user mediu e informou, compara contra a zona; senão fica warn.
  const med = input.recuos_medidos;
  const hasMedidas =
    med &&
    (med.frontal_m != null ||
      med.lateral_direito_m != null ||
      med.lateral_esquerdo_m != null ||
      med.fundos_m != null);

  if (hasMedidas) {
    const checks: Array<[string, number | null | undefined, number | null]> = [
      ["frontal", med?.frontal_m, zona.recuo_frontal_m],
      ["lateral direito", med?.lateral_direito_m, zona.recuo_lateral_m],
      ["lateral esquerdo", med?.lateral_esquerdo_m, zona.recuo_lateral_m],
      ["fundos", med?.fundos_m, zona.recuo_fundos_m],
    ];
    const parts: string[] = [];
    let worst: "ok" | "warn" | "issue" = "ok";
    for (const [name, medido, exigido] of checks) {
      if (exigido == null || exigido <= 0) continue; // zona não exige esse recuo
      if (medido == null) {
        parts.push(`${name}: exige ${exigido}m, não medido`);
        if (worst === "ok") worst = "warn";
        continue;
      }
      if (medido >= exigido) {
        parts.push(`${name}: ${medido}m ≥ ${exigido}m ✓`);
      } else {
        parts.push(`${name}: ${medido}m < ${exigido}m ✗`);
        worst = "issue";
      }
    }
    findings.push({
      id: "zoneamento_recuos",
      severity: worst,
      rule: "Recuos mínimos",
      message:
        worst === "ok"
          ? `✓ Todos os recuos atendem a zona. ${parts.join("; ")}.`
          : worst === "warn"
            ? `⚠ Recuos parcialmente medidos. ${parts.join("; ")}.`
            : `✗ Recuo abaixo do exigido. ${parts.join("; ")}.`,
      reference: ref,
    });
  } else {
    findings.push({
      id: "zoneamento_recuos",
      severity: "warn",
      rule: "Recuos mínimos",
      message: `Frontal ${zona.recuo_frontal_m}m${zona.recuo_lateral_m ? `, lateral ${zona.recuo_lateral_m}m` : ""}${zona.recuo_fundos_m ? `, fundos ${zona.recuo_fundos_m}m` : ""}. Informe os recuos medidos do projeto executivo no card "Recuos medidos" pra validar automaticamente.`,
      reference: ref,
    });
  }

  if (zona.permeabilidade_min_pct !== null) {
    findings.push({
      id: "zoneamento_permeabilidade",
      severity: "warn",
      rule: "Permeabilidade mínima",
      message: `Mínimo ${zona.permeabilidade_min_pct}% do terreno deve ser permeável (jardim, grama, calçada drenante). Confirme com o projeto paisagístico.`,
      reference: ref,
    });
  }

  if (zona.nota) {
    findings.push({
      id: "zoneamento_nota",
      severity: "warn",
      rule: "Observação da zona",
      message: zona.nota,
      reference: ref,
    });
  }

  return findings;
}

/**
 * Tier B — validação de zoneamento.
 *
 * Recebe: cidade + zona + área do terreno + extração da planta confirmada.
 * Devolve: findings compatíveis com NbrFinding (severity ok/warn/issue).
 *
 * Cobertura V0:
 *   - Taxa de ocupação (TO): área construída horizontal / área terreno
 *   - Coeficiente de aproveitamento (CA): área construída total / área terreno
 *   - Altura máxima (avisa quando há limite + pavimentos)
 *   - Vagas mínimas (compara extracao.elementos_especiais.garagem)
 *
 * NÃO cobre automaticamente (vai como warn pra verificar manual):
 *   - Recuos (precisa medidas do projeto, não temos)
 *   - Permeabilidade (precisa área permeável do terreno)
 */

export type ZoneamentoInput = {
  cidade_codigo: string;
  zona_codigo: string;
  area_terreno_m2: number;
  area_construida_total_m2: number | null; // soma de todos os ambientes (~ área extraída)
  numero_pavimentos: number | null;
  tem_garagem: boolean;
  recuos_medidos?: RecuosMedidos | null;
};

export function runZoneamentoChecks(input: ZoneamentoInput): NbrFinding[] {
  const zona = getZona(input.cidade_codigo, input.zona_codigo);
  if (!zona) return [];
  const ref = `${zona.label} (${input.cidade_codigo})`;
  return appendFindings([], zona, input, ref);
}

function severityMessage(severity: "ok" | "warn" | "issue", detail: string): string {
  if (severity === "ok") return `✓ Dentro do limite: ${detail}.`;
  if (severity === "warn") return `⚠ Próximo do limite — usar outorga onerosa: ${detail}.`;
  return `✗ Acima do permitido: ${detail}.`;
}

export type { ZoneamentoRule };
