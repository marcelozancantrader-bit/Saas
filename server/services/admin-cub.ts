import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export type CubRow = {
  id: string;
  uf: string;
  padrao: "popular" | "medio" | "alto" | "luxo";
  mes_referencia: string;
  faixa_min: number;
  faixa_max: number;
  fonte: string | null;
  updated_at: string;
};

export type CubMatrix = {
  /** Última faixa cadastrada por (uf, padrao). */
  latest: Record<string, Record<string, CubRow>>;
  /** Lista completa pra auditoria/histórico. */
  all: CubRow[];
  meses: string[];
  ufs: string[];
};

/**
 * Monta uma matriz UF × padrão com o mês mais recente cadastrado.
 * Usado pela página /admin/cub pra edição rápida.
 */
export async function loadCubMatrix(): Promise<CubMatrix> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("cub_estadual")
    .select("id, uf, padrao, mes_referencia, faixa_min, faixa_max, fonte, updated_at")
    .order("mes_referencia", { ascending: false })
    .order("uf", { ascending: true });

  const all = (data ?? []) as CubRow[];

  const latest: Record<string, Record<string, CubRow>> = {};
  for (const row of all) {
    if (!latest[row.uf]) latest[row.uf] = {};
    if (!latest[row.uf]![row.padrao]) {
      latest[row.uf]![row.padrao] = row;
    }
  }

  const meses = Array.from(new Set(all.map((r) => r.mes_referencia))).sort((a, b) =>
    b.localeCompare(a),
  );
  const ufs = Array.from(new Set(all.map((r) => r.uf))).sort();

  return { latest, all, meses, ufs };
}
