import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Itera sobre uma tabela do Supabase em páginas de 1000 (limite padrão do
 * PostgREST) e retorna TODAS as rows. Use só quando o conjunto cabe na
 * memória (ex: catálogos < 100k rows). Pra listagens grandes, prefira
 * paginação real com `range(from, to)` no caller.
 *
 * `.range(0, 99999)` SOZINHO não funciona porque o Supabase enforce um
 * `max_rows: 1000` no nível do PostgREST que cap qualquer query, e o range
 * só pagina dentro desse limite. Esta função faz N requests sequenciais
 * até a página vir incompleta (< pageSize), garantindo que pegamos tudo.
 *
 * @param buildQuery função que recebe o supabase client e retorna o
 *   PostgrestFilterBuilder (já com .from().select().eq().order() etc).
 *   NÃO chame .range() — esta função aplica. O retorno é tratado como `any`
 *   internamente porque a tipagem encadeada do supabase-js v2 é complexa
 *   demais pra valer a pena tipar exatamente; o caller passa o `TRow`
 *   esperado e ganha o array tipado.
 * @param pageSize padrão 1000. Bater no max_rows do projeto Supabase.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type QueryBuilder = any;

export async function selectAllRows<TRow>(
  supabase: SupabaseClient,
  buildQuery: (s: SupabaseClient) => QueryBuilder,
  pageSize = 1000,
): Promise<TRow[]> {
  const all: TRow[] = [];
  let offset = 0;
  // Hard cap pra evitar loop infinito se algo estiver muito errado.
  const HARD_MAX_PAGES = 200; // 200 × 1000 = 200k rows
  for (let i = 0; i < HARD_MAX_PAGES; i++) {
    const q = buildQuery(supabase);
    const { data, error } = (await q.range(offset, offset + pageSize - 1)) as {
      data: TRow[] | null;
      error: { message: string } | null;
    };
    if (error) throw new Error(`selectAllRows: ${error.message}`);
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < pageSize) break;
    offset += pageSize;
  }
  return all;
}
