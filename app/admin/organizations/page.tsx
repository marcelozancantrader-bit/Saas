import Link from "next/link";
import { requirePlatformAdmin } from "@/lib/auth/platform-admin";
import { loadAdminOrgList } from "@/server/services/admin-orgs";
import { OrgListFilters } from "@/components/features/admin-shell/OrgListFilters";
import { Badge } from "@/components/ui/badge";
import { PLANS, type PlanId } from "@/lib/plans/limits";
import { Building2, ChevronLeft, ChevronRight, AlertOctagon } from "lucide-react";

export const dynamic = "force-dynamic";

const PLAN_BADGE_COLORS: Record<PlanId, string> = {
  free: "border-zinc-700 bg-zinc-800 text-zinc-300",
  solo: "border-blue-700 bg-blue-950/40 text-blue-300",
  pro: "border-amber-700 bg-amber-950/40 text-amber-300",
  studio: "border-violet-700 bg-violet-950/40 text-violet-300",
  agency: "border-emerald-700 bg-emerald-950/40 text-emerald-300",
};

const PAGE_SIZE = 25;

type SearchParams = {
  q?: string;
  plano?: string;
  onlyPaid?: string;
  onlySuspended?: string;
  page?: string;
};

export default async function OrganizationsListPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requirePlatformAdmin();
  const sp = await searchParams;

  const page = Math.max(1, Number(sp.page ?? "1") || 1);
  const { rows, total } = await loadAdminOrgList({
    q: sp.q,
    plano: (sp.plano as PlanId | "all") ?? "all",
    onlyPaid: sp.onlyPaid === "1",
    onlySuspended: sp.onlySuspended === "1",
    page,
    pageSize: PAGE_SIZE,
  });

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-6 text-zinc-100">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold text-white">
            <Building2 className="h-6 w-6 text-amber-400" />
            Organizações
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            {total.toLocaleString("pt-BR")} organizaç{total === 1 ? "ão" : "ões"} na plataforma.
          </p>
        </div>
      </div>

      <OrgListFilters />

      <div className="overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900/30">
        <table className="w-full text-sm">
          <thead className="border-b border-zinc-800 bg-zinc-900/60 text-xs tracking-wide text-zinc-500 uppercase">
            <tr>
              <th className="px-3 py-2 text-left font-medium">Org</th>
              <th className="px-3 py-2 text-left font-medium">Plano</th>
              <th className="px-3 py-2 text-left font-medium">Owner</th>
              <th className="px-3 py-2 text-right font-medium">Members</th>
              <th className="px-3 py-2 text-right font-medium">Projetos</th>
              <th className="px-3 py-2 text-right font-medium">Docs</th>
              <th className="px-3 py-2 text-left font-medium">Criada</th>
              <th className="px-3 py-2 text-left font-medium">Última atividade</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={8} className="px-3 py-8 text-center text-sm text-zinc-500">
                  Nenhuma organização encontrada com esses filtros.
                </td>
              </tr>
            )}
            {rows.map((o) => (
              <tr
                key={o.id}
                className="border-b border-zinc-800/60 transition hover:bg-zinc-900/40"
              >
                <td className="px-3 py-2.5">
                  <Link href={`/admin/organizations/${o.id}`} className="block">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-zinc-100 group-hover:underline">
                        {o.name}
                      </span>
                      {o.is_suspended && (
                        <Badge
                          className="border-rose-700 bg-rose-950/40 text-rose-300"
                          aria-label="Suspensa"
                        >
                          <AlertOctagon className="h-3 w-3" />
                          Suspensa
                        </Badge>
                      )}
                    </div>
                    {o.cnpj && <div className="text-xs text-zinc-500">CNPJ {o.cnpj}</div>}
                  </Link>
                </td>
                <td className="px-3 py-2.5">
                  <Badge className={PLAN_BADGE_COLORS[o.plano]}>
                    {PLANS[o.plano]?.label ?? o.plano}
                  </Badge>
                </td>
                <td className="px-3 py-2.5 text-xs text-zinc-400">
                  {o.owner_email ?? <span className="text-zinc-600">—</span>}
                </td>
                <td className="px-3 py-2.5 text-right text-zinc-300 tabular-nums">
                  {o.member_count}
                </td>
                <td className="px-3 py-2.5 text-right text-zinc-300 tabular-nums">
                  {o.project_count}
                </td>
                <td className="px-3 py-2.5 text-right text-zinc-300 tabular-nums">{o.doc_count}</td>
                <td className="px-3 py-2.5 text-xs text-zinc-500">
                  {new Date(o.created_at).toLocaleDateString("pt-BR")}
                </td>
                <td className="px-3 py-2.5 text-xs text-zinc-500">
                  {o.last_activity ? new Date(o.last_activity).toLocaleDateString("pt-BR") : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-zinc-500">
          <div>
            Página {page} de {totalPages} · {total.toLocaleString("pt-BR")} resultados
          </div>
          <div className="flex items-center gap-1">
            <PageLink
              page={page - 1}
              disabled={page <= 1}
              searchParams={sp}
              label={<ChevronLeft className="h-4 w-4" />}
            />
            <PageLink
              page={page + 1}
              disabled={page >= totalPages}
              searchParams={sp}
              label={<ChevronRight className="h-4 w-4" />}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function PageLink({
  page,
  disabled,
  searchParams,
  label,
}: {
  page: number;
  disabled: boolean;
  searchParams: SearchParams;
  label: React.ReactNode;
}) {
  if (disabled) {
    return (
      <span className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-zinc-800 bg-zinc-900/20 text-zinc-700">
        {label}
      </span>
    );
  }
  const params = new URLSearchParams();
  Object.entries(searchParams).forEach(([k, v]) => {
    if (v) params.set(k, v as string);
  });
  params.set("page", String(page));
  return (
    <Link
      href={`/admin/organizations?${params.toString()}`}
      className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-zinc-800 bg-zinc-900/50 text-zinc-300 hover:bg-zinc-900"
    >
      {label}
    </Link>
  );
}
