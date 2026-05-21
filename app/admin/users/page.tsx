import Link from "next/link";
import { requirePlatformAdmin } from "@/lib/auth/platform-admin";
import { loadAdminUserList } from "@/server/services/admin-users";
import { Badge } from "@/components/ui/badge";
import { PLANS, type PlanId } from "@/lib/plans/limits";
import {
  Users as UsersIcon,
  ShieldCheck,
  Crown,
  Shield as ShieldIcon,
  User as UserIcon,
  ChevronLeft,
  ChevronRight,
  Search,
} from "lucide-react";

export const dynamic = "force-dynamic";

const PLAN_BADGE_COLORS: Record<PlanId, string> = {
  free: "border-zinc-700 bg-zinc-800 text-zinc-300",
  standard: "border-blue-700 bg-blue-950/40 text-blue-300",
  pro: "border-amber-700 bg-amber-950/40 text-amber-300",
  pro_max: "border-violet-700 bg-violet-950/40 text-violet-300",
  agency: "border-emerald-700 bg-emerald-950/40 text-emerald-300",
};

type SearchParams = {
  q?: string;
  onlyAdmins?: string;
  page?: string;
};

export default async function UsersListPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requirePlatformAdmin();
  const sp = await searchParams;

  const page = Math.max(1, Number(sp.page ?? "1") || 1);
  const { rows, total } = await loadAdminUserList({
    q: sp.q,
    onlyAdmins: sp.onlyAdmins === "1",
    page,
  });

  const totalPages = Math.max(1, Math.ceil(total / 50));

  return (
    <div className="space-y-6 text-zinc-100">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold text-white">
          <UsersIcon className="h-6 w-6 text-amber-400" />
          Usuários
        </h1>
        <p className="mt-1 text-sm text-zinc-400">
          {total.toLocaleString("pt-BR")} contas registradas.
        </p>
      </div>

      <form
        method="get"
        action="/admin/users"
        className="flex flex-wrap items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/30 p-3"
      >
        <div className="relative min-w-[280px] flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <input
            type="search"
            name="q"
            defaultValue={sp.q ?? ""}
            placeholder="Buscar por e-mail ou nome da org…"
            className="w-full rounded-md border border-zinc-800 bg-zinc-950 py-1.5 pr-3 pl-8 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-amber-500 focus:outline-none"
          />
        </div>
        <label className="flex items-center gap-1.5 text-xs text-zinc-400">
          <input
            type="checkbox"
            name="onlyAdmins"
            value="1"
            defaultChecked={sp.onlyAdmins === "1"}
            className="rounded border-zinc-700 bg-zinc-950"
          />
          Só platform admins
        </label>
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
              <th className="px-3 py-2 text-left font-medium">E-mail</th>
              <th className="px-3 py-2 text-left font-medium">Org principal</th>
              <th className="px-3 py-2 text-left font-medium">Role</th>
              <th className="px-3 py-2 text-right font-medium">Orgs</th>
              <th className="px-3 py-2 text-left font-medium">Provider</th>
              <th className="px-3 py-2 text-left font-medium">Last sign-in</th>
              <th className="px-3 py-2 text-left font-medium">Criado</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-sm text-zinc-500">
                  Nenhum usuário encontrado.
                </td>
              </tr>
            )}
            {rows.map((u) => (
              <tr
                key={u.id}
                className="border-b border-zinc-800/60 transition hover:bg-zinc-900/40"
              >
                <td className="px-3 py-2.5">
                  <Link
                    href={`/admin/users/${u.id}`}
                    className="flex items-center gap-2 text-zinc-100 hover:underline"
                  >
                    {u.is_platform_admin && <ShieldCheck className="h-3.5 w-3.5 text-amber-400" />}
                    {u.email || <em className="text-zinc-500">sem e-mail</em>}
                  </Link>
                </td>
                <td className="px-3 py-2.5">
                  {u.primary_org_name ? (
                    <div className="flex items-center gap-1.5">
                      <span className="text-zinc-300">{u.primary_org_name}</span>
                      {u.primary_org_plan && (
                        <Badge className={PLAN_BADGE_COLORS[u.primary_org_plan]}>
                          {PLANS[u.primary_org_plan]?.label}
                        </Badge>
                      )}
                    </div>
                  ) : (
                    <span className="text-zinc-600">—</span>
                  )}
                </td>
                <td className="px-3 py-2.5">
                  {u.primary_role ? (
                    <RoleBadge role={u.primary_role} />
                  ) : (
                    <span className="text-zinc-600">—</span>
                  )}
                </td>
                <td className="px-3 py-2.5 text-right text-zinc-300 tabular-nums">{u.org_count}</td>
                <td className="px-3 py-2.5 text-xs text-zinc-400">{u.provider}</td>
                <td className="px-3 py-2.5 text-xs text-zinc-500">
                  {u.last_sign_in_at
                    ? new Date(u.last_sign_in_at).toLocaleDateString("pt-BR")
                    : "nunca"}
                </td>
                <td className="px-3 py-2.5 text-xs text-zinc-500">
                  {new Date(u.created_at).toLocaleDateString("pt-BR")}
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

function RoleBadge({ role }: { role: "owner" | "admin" | "member" }) {
  if (role === "owner") {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-amber-400">
        <Crown className="h-3 w-3" /> owner
      </span>
    );
  }
  if (role === "admin") {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-blue-400">
        <ShieldIcon className="h-3 w-3" /> admin
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs text-zinc-500">
      <UserIcon className="h-3 w-3" /> member
    </span>
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
      href={`/admin/users?${params.toString()}`}
      className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-zinc-800 bg-zinc-900/50 text-zinc-300 hover:bg-zinc-900"
    >
      {children}
    </Link>
  );
}
