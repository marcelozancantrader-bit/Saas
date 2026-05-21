import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export type SinapiCatalog = {
  /** UFs com pelo menos um código SINAPI cadastrado, ordenadas alfabeticamente. */
  ufs: string[];
  /** Meses (date string YYYY-MM-DD) disponíveis por UF, ordenados do mais recente pro mais antigo. */
  mesesPorUf: Record<string, string[]>;
  /** Atalho: mês mais recente de cada UF. */
  latestMesPorUf: Record<string, string>;
};

/**
 * Lista UFs/meses cadastrados em sinapi_compositions.
 * Usado pra montar dropdowns dinâmicos do botão Regerar e pra detectar
 * o mês mais recente disponível pra geração inicial.
 *
 * Sem cache — a tabela é atualizada poucas vezes por mês (via /admin/sinapi).
 * Reler em cada request é OK pro volume de uso esperado.
 */
export async function loadSinapiCatalog(): Promise<SinapiCatalog> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("sinapi_compositions")
    .select("uf, mes_referencia")
    .order("uf", { ascending: true })
    .order("mes_referencia", { ascending: false });

  if (!data) return { ufs: [], mesesPorUf: {}, latestMesPorUf: {} };

  const mesesPorUf: Record<string, Set<string>> = {};
  for (const row of data as { uf: string; mes_referencia: string }[]) {
    if (!mesesPorUf[row.uf]) mesesPorUf[row.uf] = new Set();
    mesesPorUf[row.uf]!.add(row.mes_referencia);
  }

  const ufs = Object.keys(mesesPorUf).sort();
  const ordered: Record<string, string[]> = {};
  const latest: Record<string, string> = {};
  for (const uf of ufs) {
    const list = Array.from(mesesPorUf[uf]!).sort((a, b) => b.localeCompare(a));
    ordered[uf] = list;
    if (list[0]) latest[uf] = list[0];
  }

  return { ufs, mesesPorUf: ordered, latestMesPorUf: latest };
}

/** Tenta extrair UF do endereço completo (regex \b[A-Z]{2}\b). Fallback "SP". */
export function inferUfFromEndereco(endereco: string | null | undefined): string {
  if (!endereco) return "SP";
  const m = endereco.match(/\b([A-Z]{2})\b/);
  return m?.[1] ?? "SP";
}
