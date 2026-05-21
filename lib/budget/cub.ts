/**
 * Memorial.ai — CUB Estadual lookup.
 *
 * Substitui faixas hard-coded em v3.ts. Busca por UF + padrão + mês mais
 * recente; fallback pra faixas SE (SP) se UF não cadastrada.
 */

import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export type CubPadrao = "popular" | "medio" | "alto" | "luxo";

export type CubFaixa = {
  uf: string;
  padrao: CubPadrao;
  mes_referencia: string;
  faixa_min: number;
  faixa_max: number;
  fonte: string | null;
  /** Origem real ("db" = veio do cub_estadual, "fallback" = veio do hard-code). */
  origem: "db" | "fallback";
};

// Fallback (SE/SP base, igual ao v3.ts atual)
const FALLBACK_FAIXAS: Record<CubPadrao, { min: number; max: number }> = {
  popular: { min: 1900, max: 2400 },
  medio: { min: 2400, max: 3000 },
  alto: { min: 3000, max: 4200 },
  luxo: { min: 4200, max: 6500 },
};

/**
 * Busca a faixa CUB pra UF + padrão. Aceita mês opcional;
 * se não passar, usa o mais recente disponível.
 */
export async function getCubFaixa(uf: string, padrao: CubPadrao, mes?: Date): Promise<CubFaixa> {
  const supabase = createAdminClient();
  const ufUpper = uf.toUpperCase();

  let query = supabase
    .from("cub_estadual")
    .select("uf, padrao, mes_referencia, faixa_min, faixa_max, fonte")
    .eq("uf", ufUpper)
    .eq("padrao", padrao)
    .order("mes_referencia", { ascending: false })
    .limit(1);

  if (mes) {
    query = query.lte("mes_referencia", mes.toISOString().slice(0, 10));
  }

  const { data } = await query;
  const row = (data ?? [])[0] as
    | {
        uf: string;
        padrao: CubPadrao;
        mes_referencia: string;
        faixa_min: number;
        faixa_max: number;
        fonte: string | null;
      }
    | undefined;

  if (row) {
    return { ...row, origem: "db" };
  }

  // Fallback
  const fb = FALLBACK_FAIXAS[padrao];
  return {
    uf: ufUpper,
    padrao,
    mes_referencia: mes?.toISOString().slice(0, 10) ?? new Date().toISOString().slice(0, 10),
    faixa_min: fb.min,
    faixa_max: fb.max,
    fonte: "fallback (SE base)",
    origem: "fallback",
  };
}

export type CubCheckResult = {
  status: "ok" | "below" | "above" | "inconclusive";
  porM2: number;
  ratio: number;
  faixa: CubFaixa;
  msg: string;
};

/**
 * Compara um orçamento contra a faixa CUB da UF + padrão.
 * - status "below" se < 85% do mínimo
 * - status "above" se > 125% do máximo
 * - status "ok"    caso contrário
 */
export async function checkOrcamentoVsCubEstadual(opts: {
  total: number;
  area: number;
  padrao: CubPadrao;
  uf: string;
  mes?: Date;
}): Promise<CubCheckResult> {
  const { total, area, padrao, uf, mes } = opts;
  const faixa = await getCubFaixa(uf, padrao, mes);
  const porM2 = area > 0 ? total / area : 0;
  const meio = (faixa.faixa_min + faixa.faixa_max) / 2;
  const ratio = meio > 0 ? porM2 / meio : 0;

  if (porM2 < faixa.faixa_min * 0.85) {
    return {
      status: "below",
      porM2,
      ratio,
      faixa,
      msg: `Orçamento em R$ ${porM2.toFixed(0)}/m² está abaixo da faixa CUB ${padrao} de ${faixa.uf} (R$ ${faixa.faixa_min}-${faixa.faixa_max}/m²). Revise se há itens faltando ou se o padrão construtivo está correto.`,
    };
  }

  if (porM2 > faixa.faixa_max * 1.25) {
    return {
      status: "above",
      porM2,
      ratio,
      faixa,
      msg: `Orçamento em R$ ${porM2.toFixed(0)}/m² está acima da faixa CUB ${padrao} de ${faixa.uf} (R$ ${faixa.faixa_min}-${faixa.faixa_max}/m²). Verifique quantitativos e BDI.`,
    };
  }

  return {
    status: "ok",
    porM2,
    ratio,
    faixa,
    msg: `Orçamento em R$ ${porM2.toFixed(0)}/m² está dentro da faixa CUB ${padrao} de ${faixa.uf} (R$ ${faixa.faixa_min}-${faixa.faixa_max}/m²).`,
  };
}
