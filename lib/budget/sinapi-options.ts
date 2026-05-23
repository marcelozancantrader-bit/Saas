import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { selectAllRows } from "@/lib/supabase/paginate";
import { CIDADES } from "@/lib/zoneamento/cidades";

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
  // PostgREST aplica max_rows=1000 por default. Como a base SINAPI tem
  // ~2.5k+ rows (27 UFs × ~48 códigos × 2 regimes), .range() sozinho NÃO
  // resolve — só pagina dentro do limite. Precisa paginação real.
  // Sem isso, só os primeiros ~10 UFs alfabéticos aparecem no catálogo.
  const data = await selectAllRows<{ uf: string; mes_referencia: string }>(supabase, (s) =>
    s
      .from("sinapi_compositions")
      .select("uf, mes_referencia")
      .order("uf", { ascending: true })
      .order("mes_referencia", { ascending: false }),
  );

  if (!data || data.length === 0) {
    return { ufs: [], mesesPorUf: {}, latestMesPorUf: {} };
  }

  const mesesPorUf: Record<string, Set<string>> = {};
  for (const row of data) {
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

const UFS_VALIDAS = new Set([
  "AC",
  "AL",
  "AP",
  "AM",
  "BA",
  "CE",
  "DF",
  "ES",
  "GO",
  "MA",
  "MT",
  "MS",
  "MG",
  "PA",
  "PB",
  "PR",
  "PE",
  "PI",
  "RJ",
  "RN",
  "RS",
  "RO",
  "RR",
  "SC",
  "SP",
  "SE",
  "TO",
]);

/**
 * Extrai UF do endereço completo.
 *
 * Estratégia: procura UF no FINAL da string (padrão BR: "..., Cidade/UF" ou
 * "..., Cidade - UF" ou "..., Cidade UF") e valida contra a lista das 27 UFs.
 *
 * Evita falsos positivos da regex antiga \b[A-Z]{2}\b que pegava "AV", "DR",
 * "JR" etc.
 *
 * Retorna null se não encontrar — caller decide fallback.
 */
export function inferUfFromEndereco(endereco: string | null | undefined): string | null {
  if (!endereco) return null;

  const tail = endereco.match(/(?:[\s,/\-–·]+)([A-Z]{2})\.?\s*$/i);
  if (tail?.[1]) {
    const candidate = tail[1].toUpperCase();
    if (UFS_VALIDAS.has(candidate)) return candidate;
  }

  for (const uf of UFS_VALIDAS) {
    const re = new RegExp(`(?:^|[\\s,/\\-–·])${uf}(?:[\\s,/\\-–·.]|$)`, "i");
    if (re.test(endereco)) {
      const match = endereco.match(re);
      if (match && match[0].includes(uf)) return uf;
    }
  }

  return null;
}

/**
 * Resolve a UF da obra em hierarquia de fontes confiáveis:
 *   1. cidade_codigo (curado em lib/zoneamento/cidades.ts) — sempre certo se setado
 *   2. endereco_completo (regex robusta) — pode falhar se usuário não pôs UF
 *   3. endereco_uf do cliente vinculado — última fonte
 *   4. fallback "SP"
 */
export function resolveProjectUf(input: {
  cidade_codigo?: string | null;
  endereco_completo?: string | null;
  client_uf?: string | null;
}): string {
  if (input.cidade_codigo && CIDADES[input.cidade_codigo]?.uf) {
    return CIDADES[input.cidade_codigo]!.uf;
  }
  const fromEndereco = inferUfFromEndereco(input.endereco_completo);
  if (fromEndereco) return fromEndereco;
  if (input.client_uf && UFS_VALIDAS.has(input.client_uf.toUpperCase())) {
    return input.client_uf.toUpperCase();
  }
  return "SP";
}
