import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export type SinapiStats = {
  totalRows: number;
  totalCodes: number;
  totalUfs: number;
  latestMes: string | null;
  oldestMes: string | null;
};

export async function loadSinapiStats(): Promise<SinapiStats> {
  const supabase = createAdminClient();

  const [{ count: totalRows }, { data: distinct }] = await Promise.all([
    supabase.from("sinapi_compositions").select("codigo", { count: "exact", head: true }),
    supabase
      .from("sinapi_compositions")
      .select("codigo, uf, mes_referencia")
      .order("mes_referencia", { ascending: false }),
  ]);

  const rows = ((distinct as { codigo: string; uf: string; mes_referencia: string }[] | null) ??
    []) as Array<{
    codigo: string;
    uf: string;
    mes_referencia: string;
  }>;

  const codes = new Set(rows.map((r) => r.codigo));
  const ufs = new Set(rows.map((r) => r.uf));
  const meses = rows.map((r) => r.mes_referencia).sort();

  return {
    totalRows: totalRows ?? 0,
    totalCodes: codes.size,
    totalUfs: ufs.size,
    latestMes: meses[meses.length - 1] ?? null,
    oldestMes: meses[0] ?? null,
  };
}

export type SinapiRow = {
  codigo: string;
  descricao: string;
  unidade: string;
  uf: string;
  mes_referencia: string;
  desonerado: boolean;
  preco: string;
};

export type SinapiPage = {
  rows: SinapiRow[];
  total: number;
  page: number;
  pageSize: number;
};

export async function loadSinapiRows(opts: {
  page?: number;
  pageSize?: number;
  uf?: string | null;
  mes?: string | null;
  q?: string | null;
  desonerado?: boolean | null;
}): Promise<SinapiPage> {
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = Math.min(100, Math.max(10, opts.pageSize ?? 25));
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const supabase = createAdminClient();
  let query = supabase
    .from("sinapi_compositions")
    .select("codigo, descricao, unidade, uf, mes_referencia, desonerado, preco", {
      count: "exact",
    });

  if (opts.uf) query = query.eq("uf", opts.uf.toUpperCase());
  if (opts.mes) query = query.eq("mes_referencia", opts.mes);
  if (typeof opts.desonerado === "boolean") query = query.eq("desonerado", opts.desonerado);
  if (opts.q && opts.q.trim()) {
    const term = opts.q.trim();
    query = query.or(`codigo.ilike.%${term}%,descricao.ilike.%${term}%`);
  }

  const { data, count } = await query
    .order("mes_referencia", { ascending: false })
    .order("uf", { ascending: true })
    .order("codigo", { ascending: true })
    .range(from, to);

  return {
    rows: (data ?? []) as SinapiRow[],
    total: count ?? 0,
    page,
    pageSize,
  };
}
