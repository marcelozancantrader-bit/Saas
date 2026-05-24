import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { selectAllRows } from "@/lib/supabase/paginate";
import { buttonVariants } from "@/components/ui/button";

export const metadata = {
  title: "Valor CUB por UF — Memorial.ai",
  description:
    "CUB (Custo Unitário Básico) atualizado por estado e padrão construtivo. Fonte SINDUSCON regionais. Útil pra estimar custo de obra por m² em qualquer região brasileira.",
};

type CubRow = {
  uf: string;
  padrao: "popular" | "medio" | "alto" | "luxo";
  mes_referencia: string;
  faixa_min: number;
  faixa_max: number;
};

const PADRAO_LABEL: Record<CubRow["padrao"], string> = {
  popular: "Popular",
  medio: "Médio",
  alto: "Alto",
  luxo: "Luxo",
};

const PADRAO_ORDER: CubRow["padrao"][] = ["popular", "medio", "alto", "luxo"];

function brl(v: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(v);
}

function mesLabel(iso: string): string {
  const [y, m] = iso.split("-");
  const meses = [
    "jan",
    "fev",
    "mar",
    "abr",
    "mai",
    "jun",
    "jul",
    "ago",
    "set",
    "out",
    "nov",
    "dez",
  ];
  return `${meses[Number(m) - 1]}/${y}`;
}

export default async function CubRegionalPage() {
  const supabase = createAdminClient();
  const rows = await selectAllRows<CubRow>(supabase, (s) =>
    s
      .from("cub_estadual")
      .select("uf, padrao, mes_referencia, faixa_min, faixa_max")
      .order("uf", { ascending: true })
      .order("mes_referencia", { ascending: false }),
  );

  // Pega só o mês mais recente de cada (UF, padrão)
  const latest = new Map<string, CubRow>();
  for (const r of rows) {
    const key = `${r.uf}|${r.padrao}`;
    if (!latest.has(key)) latest.set(key, r);
  }

  // Agrupa por UF
  const byUf = new Map<string, Record<CubRow["padrao"], CubRow | undefined>>();
  for (const r of latest.values()) {
    if (!byUf.has(r.uf)) {
      byUf.set(r.uf, { popular: undefined, medio: undefined, alto: undefined, luxo: undefined });
    }
    byUf.get(r.uf)![r.padrao] = r;
  }
  const ufs = Array.from(byUf.keys()).sort();
  const refMes = rows[0]?.mes_referencia ?? null;

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <div>
        <Link href="/ferramentas" className="text-sm text-zinc-500 hover:underline">
          ← Todas as ferramentas
        </Link>
        <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Valor CUB por estado</h1>
        <p className="mt-3 max-w-2xl text-base text-zinc-600 dark:text-zinc-400">
          CUB (Custo Unitário Básico) é o custo médio referencial da construção civil por m²,
          publicado mensalmente pelos SINDUSCON regionais. Use pra estimativa rápida de custo de
          obra: <strong>custo = área × CUB do padrão</strong>.
        </p>
        {refMes ? (
          <p className="mt-2 text-xs text-zinc-500">
            Data base mais recente: <strong>{mesLabel(refMes)}</strong>
          </p>
        ) : null}
      </div>

      <div className="mt-8 overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 dark:bg-zinc-900">
            <tr>
              <th className="px-4 py-3 text-left font-semibold">UF</th>
              {PADRAO_ORDER.map((p) => (
                <th key={p} className="px-4 py-3 text-right font-semibold">
                  {PADRAO_LABEL[p]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ufs.map((uf, idx) => {
              const padroes = byUf.get(uf)!;
              return (
                <tr
                  key={uf}
                  className={
                    idx % 2 === 0
                      ? "bg-white dark:bg-zinc-950"
                      : "bg-zinc-50/60 dark:bg-zinc-900/40"
                  }
                >
                  <td className="border-t border-zinc-200 px-4 py-3 font-semibold dark:border-zinc-800">
                    {uf}
                  </td>
                  {PADRAO_ORDER.map((p) => {
                    const row = padroes[p];
                    return (
                      <td
                        key={p}
                        className="border-t border-zinc-200 px-4 py-3 text-right tabular-nums dark:border-zinc-800"
                      >
                        {row ? (
                          <span className="text-zinc-800 dark:text-zinc-200">
                            {brl(row.faixa_min)} – {brl(row.faixa_max)}
                          </span>
                        ) : (
                          <span className="text-zinc-400">—</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-6 rounded-lg border border-blue-200 bg-blue-50/50 p-4 text-sm dark:border-blue-900/40 dark:bg-blue-950/20">
        <p className="font-semibold text-blue-900 dark:text-blue-100">Como interpretar</p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-zinc-700 dark:text-zinc-300">
          <li>
            <strong>Popular</strong>: residência simples, acabamento básico (~50–80 m², 1 banheiro)
          </li>
          <li>
            <strong>Médio</strong>: casa/apto padrão classe média (~100–150 m², 2–3 dormitórios)
          </li>
          <li>
            <strong>Alto</strong>: residência de luxo (~200–400 m², acabamentos finos)
          </li>
          <li>
            <strong>Luxo</strong>: mansão / cobertura de alto padrão (acima de 400 m², acabamentos
            premium)
          </li>
        </ul>
      </div>

      <div className="mt-8 rounded-xl border border-blue-200 bg-gradient-to-br from-blue-50 to-white p-6 text-center dark:border-blue-900/50 dark:from-blue-950/30 dark:to-zinc-900">
        <h2 className="text-lg font-semibold">
          Precisa de orçamento completo com 30+ itens SINAPI?
        </h2>
        <p className="mx-auto mt-2 max-w-xl text-sm text-zinc-600 dark:text-zinc-400">
          O Memorial.ai usa o mesmo CUB acima como referência, mas também gera composição SINAPI
          item-a-item com BDI, curva ABC e pedido de cotação pra fornecedor — em 1 minuto. Grátis
          até 2 projetos e 3 documentos por mês.
        </p>
        <Link href="/signup" className={`${buttonVariants({ size: "lg" })} mt-4`}>
          Criar conta grátis →
        </Link>
      </div>
    </div>
  );
}

export const dynamic = "force-dynamic";
