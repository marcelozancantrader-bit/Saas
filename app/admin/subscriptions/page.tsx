import Link from "next/link";
import { requirePlatformAdmin } from "@/lib/auth/platform-admin";
import {
  loadAdminSubscriptionList,
  loadAdminSubsKpis,
} from "@/server/services/admin-subscriptions";
import { CancelSubButton } from "@/components/features/admin-shell/CancelSubButton";
import { Badge } from "@/components/ui/badge";
import { PLAN_ORDER, PLANS, type PlanId } from "@/lib/plans/limits";
import { formatBrlCompact } from "@/lib/admin/saas-metrics";
import { CreditCard, ChevronLeft, ChevronRight } from "lucide-react";

export const dynamic = "force-dynamic";

const PLAN_BADGE_COLORS: Record<PlanId, string> = {
  free: "border-zinc-700 bg-zinc-800 text-zinc-300",
  solo: "border-blue-700 bg-blue-950/40 text-blue-300",
  pro: "border-amber-700 bg-amber-950/40 text-amber-300",
  studio: "border-violet-700 bg-violet-950/40 text-violet-300",
  agency: "border-emerald-700 bg-emerald-950/40 text-emerald-300",
};

const STATUS_COLORS: Record<string, string> = {
  active: "border-emerald-700 bg-emerald-950/40 text-emerald-300",
  past_due: "border-amber-700 bg-amber-950/40 text-amber-300",
  canceled: "border-zinc-700 bg-zinc-900 text-zinc-400",
  trialing: "border-blue-700 bg-blue-950/40 text-blue-300",
  pending: "border-zinc-700 bg-zinc-900 text-zinc-400",
};

const STATUS_OPTIONS = ["all", "active", "past_due", "trialing", "canceled", "pending"];
const PROVIDER_OPTIONS = ["all", "asaas", "stripe", "manual"];

type SearchParams = {
  status?: string;
  plano?: string;
  provider?: string;
  page?: string;
};

export default async function SubscriptionsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requirePlatformAdmin();
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page ?? "1") || 1);

  const [{ rows, total }, kpis] = await Promise.all([
    loadAdminSubscriptionList({
      status: sp.status,
      plano: (sp.plano as PlanId | "all") ?? "all",
      provider: sp.provider,
      page,
    }),
    loadAdminSubsKpis(),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / 50));

  return (
    <div className="space-y-6 text-zinc-100">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold text-white">
          <CreditCard className="h-6 w-6 text-amber-400" />
          Assinaturas
        </h1>
        <p className="mt-1 text-sm text-zinc-400">
          {total.toLocaleString("pt-BR")} subscriptions na plataforma.
        </p>
      </div>

      <section className="grid gap-3 md:grid-cols-3 lg:grid-cols-6">
        <KpiTile label="Ativas" value={kpis.active} accent />
        <KpiTile label="MRR" value={formatBrlCompact(kpis.totalMrrCents)} text accent />
        <KpiTile
          label="Past due"
          value={kpis.past_due}
          tone={kpis.past_due > 0 ? "negative" : undefined}
        />
        <KpiTile label="Trialing" value={kpis.trialing} />
        <KpiTile label="Canceladas" value={kpis.canceled} />
        <KpiTile label="Pending" value={kpis.pending} />
      </section>

      <form
        method="get"
        action="/admin/subscriptions"
        className="flex flex-wrap items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/30 p-3"
      >
        <select
          name="status"
          defaultValue={sp.status ?? "all"}
          className="rounded-md border border-zinc-800 bg-zinc-950 px-2 py-1.5 text-sm text-zinc-100 focus:border-amber-500 focus:outline-none"
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s === "all" ? "Todos os status" : s}
            </option>
          ))}
        </select>
        <select
          name="plano"
          defaultValue={sp.plano ?? "all"}
          className="rounded-md border border-zinc-800 bg-zinc-950 px-2 py-1.5 text-sm text-zinc-100 focus:border-amber-500 focus:outline-none"
        >
          <option value="all">Todos os planos</option>
          {PLAN_ORDER.map((p) => (
            <option key={p} value={p}>
              {PLANS[p].label}
            </option>
          ))}
        </select>
        <select
          name="provider"
          defaultValue={sp.provider ?? "all"}
          className="rounded-md border border-zinc-800 bg-zinc-950 px-2 py-1.5 text-sm text-zinc-100 focus:border-amber-500 focus:outline-none"
        >
          {PROVIDER_OPTIONS.map((p) => (
            <option key={p} value={p}>
              {p === "all" ? "Todos os providers" : p}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="rounded-md border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-200 hover:bg-zinc-800"
        >
          Filtrar
        </button>
      </form>

      <div className="overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900/30">
        <table className="w-full text-sm">
          <thead className="border-b border-zinc-800 bg-zinc-900/60 text-xs tracking-wide text-zinc-500 uppercase">
            <tr>
              <th className="px-3 py-2 text-left font-medium">Org</th>
              <th className="px-3 py-2 text-left font-medium">Plano</th>
              <th className="px-3 py-2 text-left font-medium">Status</th>
              <th className="px-3 py-2 text-left font-medium">Provider</th>
              <th className="px-3 py-2 text-left font-medium">Período</th>
              <th className="px-3 py-2 text-left font-medium">Criada</th>
              <th className="px-3 py-2 text-right font-medium">Ações</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-sm text-zinc-500">
                  Nenhuma subscription encontrada.
                </td>
              </tr>
            )}
            {rows.map((s) => (
              <tr key={s.id} className="border-b border-zinc-800/60 hover:bg-zinc-900/40">
                <td className="px-3 py-2.5">
                  <Link
                    href={`/admin/organizations/${s.org_id}`}
                    className="text-zinc-100 hover:underline"
                  >
                    {s.org_name}
                  </Link>
                </td>
                <td className="px-3 py-2.5">
                  <Badge className={PLAN_BADGE_COLORS[s.plano]}>
                    {PLANS[s.plano]?.label ?? s.plano}
                  </Badge>
                </td>
                <td className="px-3 py-2.5">
                  <Badge className={STATUS_COLORS[s.status] ?? STATUS_COLORS.pending}>
                    {s.status}
                  </Badge>
                </td>
                <td className="px-3 py-2.5 text-xs text-zinc-400">{s.provider}</td>
                <td className="px-3 py-2.5 text-xs text-zinc-500">
                  {s.current_period_start
                    ? `${new Date(s.current_period_start).toLocaleDateString("pt-BR")} → ${
                        s.current_period_end
                          ? new Date(s.current_period_end).toLocaleDateString("pt-BR")
                          : "—"
                      }`
                    : "—"}
                </td>
                <td className="px-3 py-2.5 text-xs text-zinc-500">
                  {new Date(s.created_at).toLocaleDateString("pt-BR")}
                </td>
                <td className="px-3 py-2.5 text-right">
                  {s.status === "active" || s.status === "past_due" || s.status === "trialing" ? (
                    <CancelSubButton subId={s.id} />
                  ) : (
                    <span className="text-xs text-zinc-600">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-zinc-500">
          <div>
            Página {page} de {totalPages}
          </div>
          <div className="flex items-center gap-1">
            <PageLink page={page - 1} disabled={page <= 1} sp={sp}>
              <ChevronLeft className="h-4 w-4" />
            </PageLink>
            <PageLink page={page + 1} disabled={page >= totalPages} sp={sp}>
              <ChevronRight className="h-4 w-4" />
            </PageLink>
          </div>
        </div>
      )}
    </div>
  );
}

function KpiTile({
  label,
  value,
  accent,
  tone,
  text,
}: {
  label: string;
  value: number | string;
  accent?: boolean;
  tone?: "negative";
  text?: boolean;
}) {
  const display = text ? value : typeof value === "number" ? value.toLocaleString("pt-BR") : value;
  const color = tone === "negative" ? "text-rose-400" : accent ? "text-amber-300" : "text-zinc-100";
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
      <div className="text-[11px] tracking-wide text-zinc-500 uppercase">{label}</div>
      <div className={`mt-1 text-2xl font-semibold ${color}`}>{display}</div>
    </div>
  );
}

function PageLink({
  page,
  disabled,
  sp,
  children,
}: {
  page: number;
  disabled: boolean;
  sp: SearchParams;
  children: React.ReactNode;
}) {
  if (disabled) {
    return (
      <span className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-zinc-800 bg-zinc-900/20 text-zinc-700">
        {children}
      </span>
    );
  }
  const params = new URLSearchParams();
  Object.entries(sp).forEach(([k, v]) => {
    if (v) params.set(k, v as string);
  });
  params.set("page", String(page));
  return (
    <Link
      href={`/admin/subscriptions?${params.toString()}`}
      className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-zinc-800 bg-zinc-900/50 text-zinc-300 hover:bg-zinc-900"
    >
      {children}
    </Link>
  );
}
