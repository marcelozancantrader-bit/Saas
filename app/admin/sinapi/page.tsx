import Link from "next/link";
import { Database } from "lucide-react";
import { requirePlatformAdmin } from "@/lib/auth/platform-admin";
import { loadSinapiStats, loadSinapiRows } from "@/server/services/admin-sinapi";
import { SinapiImporter } from "@/components/features/admin-shell/SinapiImporter";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 25;

type Props = {
  searchParams: Promise<{
    uf?: string;
    mes?: string;
    q?: string;
    deson?: string;
    page?: string;
  }>;
};

export default async function SinapiAdminPage({ searchParams }: Props) {
  await requirePlatformAdmin();
  const sp = await searchParams;

  const [stats, paged] = await Promise.all([
    loadSinapiStats(),
    loadSinapiRows({
      page: Number(sp.page) || 1,
      pageSize: PAGE_SIZE,
      uf: sp.uf || null,
      mes: sp.mes || null,
      q: sp.q || null,
      desonerado: sp.deson === "true" ? true : sp.deson === "false" ? false : null,
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(paged.total / paged.pageSize));
  const ageDays = stats.latestMes ? daysSince(stats.latestMes) : null;

  const buildLink = (overrides: Record<string, string | undefined>) => {
    const params = new URLSearchParams();
    const merged = { ...sp, ...overrides };
    for (const [k, v] of Object.entries(merged)) {
      if (v && v.length > 0) params.set(k, v);
    }
    const qs = params.toString();
    return `/admin/sinapi${qs ? `?${qs}` : ""}`;
  };

  return (
    <div className="space-y-6 text-zinc-100">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold text-white">
          <Database className="h-6 w-6 text-amber-400" />
          SINAPI — composições e preços
        </h1>
        <p className="mt-1 text-sm text-zinc-400">
          Atualize os preços SINAPI nacional. Os orçamentos novos usam o mês mais recente disponível
          por UF.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total de preços" value={stats.totalRows.toLocaleString("pt-BR")} />
        <StatCard label="Códigos únicos" value={stats.totalCodes.toLocaleString("pt-BR")} />
        <StatCard label="UFs cobertas" value={`${stats.totalUfs} / 27`} />
        <StatCard
          label="Mês mais recente"
          value={stats.latestMes ? stats.latestMes.slice(0, 7) : "—"}
          hint={
            ageDays !== null
              ? ageDays > 60
                ? `${ageDays} dias atrás — atualize`
                : `${ageDays} dias atrás`
              : null
          }
          warn={ageDays !== null && ageDays > 60}
        />
      </div>

      <SinapiImporter />

      <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
        <div className="mb-3 flex flex-wrap items-end gap-2">
          <h2 className="flex-1 text-base font-semibold text-zinc-100">Base atual</h2>
          <form className="flex flex-wrap items-end gap-2 text-xs text-zinc-200" method="GET">
            <input
              name="q"
              defaultValue={sp.q ?? ""}
              placeholder="Buscar código/descrição"
              className="rounded border border-zinc-700 bg-zinc-950 px-2 py-1 text-zinc-100 placeholder:text-zinc-500"
            />
            <input
              name="uf"
              defaultValue={sp.uf ?? ""}
              maxLength={2}
              placeholder="UF"
              className="w-14 rounded border border-zinc-700 bg-zinc-950 px-2 py-1 uppercase placeholder:text-zinc-500"
            />
            <input
              name="mes"
              defaultValue={sp.mes ?? ""}
              placeholder="2026-05-01"
              className="w-28 rounded border border-zinc-700 bg-zinc-950 px-2 py-1 placeholder:text-zinc-500"
            />
            <select
              name="deson"
              defaultValue={sp.deson ?? ""}
              className="rounded border border-zinc-700 bg-zinc-950 px-2 py-1"
            >
              <option value="">Regime</option>
              <option value="true">Desonerado</option>
              <option value="false">Não-desonerado</option>
            </select>
            <button
              type="submit"
              className="rounded border border-amber-500/60 bg-amber-500/20 px-2.5 py-1 text-amber-200 hover:bg-amber-500/30"
            >
              Filtrar
            </button>
          </form>
        </div>

        {paged.rows.length === 0 ? (
          <p className="py-8 text-center text-sm text-zinc-500">
            Nenhuma composição encontrada com esses filtros.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs">
              <thead className="text-zinc-400">
                <tr>
                  <th className="px-2 py-1.5 text-left">Código</th>
                  <th className="px-2 py-1.5 text-left">UF</th>
                  <th className="px-2 py-1.5 text-left">Mês</th>
                  <th className="px-2 py-1.5 text-left">Un.</th>
                  <th className="px-2 py-1.5 text-left">Deson.</th>
                  <th className="px-2 py-1.5 text-right">Preço</th>
                  <th className="px-2 py-1.5 text-left">Descrição</th>
                </tr>
              </thead>
              <tbody className="text-zinc-200">
                {paged.rows.map((r) => (
                  <tr
                    key={`${r.codigo}|${r.uf}|${r.mes_referencia}|${r.desonerado}`}
                    className="border-t border-zinc-800/60"
                  >
                    <td className="px-2 py-1.5 font-mono">{r.codigo}</td>
                    <td className="px-2 py-1.5">{r.uf}</td>
                    <td className="px-2 py-1.5">{r.mes_referencia.slice(0, 7)}</td>
                    <td className="px-2 py-1.5">{r.unidade}</td>
                    <td className="px-2 py-1.5">{r.desonerado ? "sim" : "não"}</td>
                    <td className="px-2 py-1.5 text-right">
                      R${" "}
                      {Number(r.preco).toLocaleString("pt-BR", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </td>
                    <td className="px-2 py-1.5 text-zinc-400">{r.descricao.slice(0, 80)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 ? (
          <div className="mt-3 flex items-center justify-between border-t border-zinc-800/60 pt-3 text-xs text-zinc-400">
            <span>
              Página {paged.page} de {totalPages} · {paged.total.toLocaleString("pt-BR")} registros
            </span>
            <div className="flex gap-1">
              {paged.page > 1 ? (
                <Link
                  href={buildLink({ page: String(paged.page - 1) })}
                  className="rounded border border-zinc-700 px-2 py-1 hover:bg-zinc-800"
                >
                  ← Anterior
                </Link>
              ) : null}
              {paged.page < totalPages ? (
                <Link
                  href={buildLink({ page: String(paged.page + 1) })}
                  className="rounded border border-zinc-700 px-2 py-1 hover:bg-zinc-800"
                >
                  Próxima →
                </Link>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function daysSince(isoDate: string): number {
  return Math.floor((new Date().getTime() - new Date(isoDate).getTime()) / (1000 * 60 * 60 * 24));
}

function StatCard({
  label,
  value,
  hint,
  warn,
}: {
  label: string;
  value: string;
  hint?: string | null;
  warn?: boolean;
}) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3">
      <p className="text-[10px] tracking-wider text-zinc-500 uppercase">{label}</p>
      <p className="mt-1 text-xl font-semibold text-zinc-100">{value}</p>
      {hint ? (
        <p className={`mt-1 text-xs ${warn ? "text-amber-400" : "text-zinc-500"}`}>{hint}</p>
      ) : null}
    </div>
  );
}
