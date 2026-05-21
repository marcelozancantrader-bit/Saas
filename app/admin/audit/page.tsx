import Link from "next/link";
import { requirePlatformAdmin } from "@/lib/auth/platform-admin";
import { loadAdminAuditLog } from "@/server/services/admin-audit";
import { ScrollText, ChevronLeft, ChevronRight, Download, ShieldCheck } from "lucide-react";

export const dynamic = "force-dynamic";

const ACTOR_TYPES = ["all", "user", "platform_admin", "client_portal", "system"];

type SearchParams = {
  q?: string;
  action?: string;
  actor_type?: string;
  org_id?: string;
  from?: string;
  to?: string;
  page?: string;
};

export default async function AuditPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requirePlatformAdmin();
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page ?? "1") || 1);

  const { rows, total, distinctActions } = await loadAdminAuditLog({
    q: sp.q,
    action: sp.action,
    actor_type: sp.actor_type,
    org_id: sp.org_id,
    from: sp.from,
    to: sp.to,
    page,
  });

  const totalPages = Math.max(1, Math.ceil(total / 50));

  const csvUrl = new URLSearchParams();
  Object.entries(sp).forEach(([k, v]) => {
    if (v && k !== "page") csvUrl.set(k, v as string);
  });

  return (
    <div className="space-y-6 text-zinc-100">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold text-white">
            <ScrollText className="h-6 w-6 text-amber-400" />
            Auditoria global
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            {total.toLocaleString("pt-BR")} eventos. Inclui ações de usuários, platform admin,
            portal do cliente e sistema.
          </p>
        </div>
        <a
          href={`/admin/audit/export?${csvUrl.toString()}`}
          className="inline-flex items-center gap-1.5 rounded-md border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-200 hover:bg-zinc-800"
        >
          <Download className="h-3.5 w-3.5" />
          Exportar CSV (até 5000)
        </a>
      </div>

      <form
        method="get"
        action="/admin/audit"
        className="grid gap-2 rounded-lg border border-zinc-800 bg-zinc-900/30 p-3 md:grid-cols-6"
      >
        <input
          type="search"
          name="q"
          defaultValue={sp.q ?? ""}
          placeholder="Action contém…"
          className="rounded-md border border-zinc-800 bg-zinc-950 px-2 py-1.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-amber-500 focus:outline-none"
        />
        <select
          name="action"
          defaultValue={sp.action ?? "all"}
          className="rounded-md border border-zinc-800 bg-zinc-950 px-2 py-1.5 text-sm text-zinc-100 focus:border-amber-500 focus:outline-none"
        >
          <option value="all">Todas actions</option>
          {distinctActions.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
        <select
          name="actor_type"
          defaultValue={sp.actor_type ?? "all"}
          className="rounded-md border border-zinc-800 bg-zinc-950 px-2 py-1.5 text-sm text-zinc-100 focus:border-amber-500 focus:outline-none"
        >
          {ACTOR_TYPES.map((a) => (
            <option key={a} value={a}>
              {a === "all" ? "Todos actors" : a}
            </option>
          ))}
        </select>
        <input
          type="date"
          name="from"
          defaultValue={sp.from ?? ""}
          className="rounded-md border border-zinc-800 bg-zinc-950 px-2 py-1.5 text-sm text-zinc-100 focus:border-amber-500 focus:outline-none"
        />
        <input
          type="date"
          name="to"
          defaultValue={sp.to ?? ""}
          className="rounded-md border border-zinc-800 bg-zinc-950 px-2 py-1.5 text-sm text-zinc-100 focus:border-amber-500 focus:outline-none"
        />
        <button
          type="submit"
          className="rounded-md border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-200 hover:bg-zinc-800"
        >
          Filtrar
        </button>
      </form>

      <div className="overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900/30">
        <table className="w-full text-xs">
          <thead className="border-b border-zinc-800 bg-zinc-900/60 tracking-wide text-zinc-500 uppercase">
            <tr>
              <th className="px-3 py-2 text-left font-medium">Quando</th>
              <th className="px-3 py-2 text-left font-medium">Actor</th>
              <th className="px-3 py-2 text-left font-medium">Action</th>
              <th className="px-3 py-2 text-left font-medium">Entidade</th>
              <th className="px-3 py-2 text-left font-medium">Org</th>
              <th className="px-3 py-2 text-left font-medium">IP</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-sm text-zinc-500">
                  Nenhum evento com esses filtros.
                </td>
              </tr>
            )}
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-zinc-800/60 hover:bg-zinc-900/40">
                <td className="px-3 py-2 text-zinc-500">
                  {new Date(r.created_at).toLocaleString("pt-BR")}
                </td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-1.5">
                    {r.actor_type === "platform_admin" && (
                      <ShieldCheck className="h-3 w-3 text-amber-400" />
                    )}
                    <span
                      className={
                        r.actor_type === "platform_admin"
                          ? "text-amber-300"
                          : r.actor_type === "system"
                            ? "text-blue-400"
                            : r.actor_type === "client_portal"
                              ? "text-emerald-300"
                              : "text-zinc-300"
                      }
                    >
                      {r.actor_email ?? r.actor_type}
                    </span>
                  </div>
                </td>
                <td className="px-3 py-2">
                  <code className="text-zinc-200">{r.action}</code>
                </td>
                <td className="px-3 py-2 text-zinc-400">
                  {r.entity_type}
                  {r.entity_id ? (
                    <span className="text-zinc-600"> ({r.entity_id.slice(0, 8)}…)</span>
                  ) : null}
                </td>
                <td className="px-3 py-2">
                  {r.org_id ? (
                    <Link
                      href={`/admin/organizations/${r.org_id}`}
                      className="text-zinc-300 hover:underline"
                    >
                      {r.org_name ?? r.org_id.slice(0, 8)}
                    </Link>
                  ) : (
                    <span className="text-zinc-600">platform-wide</span>
                  )}
                </td>
                <td className="px-3 py-2 text-zinc-500">{r.ip ?? "—"}</td>
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
      href={`/admin/audit?${params.toString()}`}
      className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-zinc-800 bg-zinc-900/50 text-zinc-300 hover:bg-zinc-900"
    >
      {children}
    </Link>
  );
}
