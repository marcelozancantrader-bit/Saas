import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePlatformAdmin } from "@/lib/auth/platform-admin";
import { loadAdminUserDetail } from "@/server/services/admin-users";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ImpersonateButton } from "@/components/features/admin-shell/ImpersonateButton";
import { PLANS, type PlanId } from "@/lib/plans/limits";
import {
  ChevronLeft,
  ShieldCheck,
  Crown,
  Shield as ShieldIcon,
  User as UserIcon,
  AlertOctagon,
  Mail,
  Calendar,
  Activity,
} from "lucide-react";

export const dynamic = "force-dynamic";

const PLAN_BADGE_COLORS: Record<PlanId, string> = {
  free: "border-zinc-700 bg-zinc-800 text-zinc-300",
  solo: "border-blue-700 bg-blue-950/40 text-blue-300",
  pro: "border-amber-700 bg-amber-950/40 text-amber-300",
  studio: "border-violet-700 bg-violet-950/40 text-violet-300",
  agency: "border-emerald-700 bg-emerald-950/40 text-emerald-300",
};

export default async function UserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePlatformAdmin();
  const { id } = await params;
  const user = await loadAdminUserDetail(id);
  if (!user) notFound();

  return (
    <div className="space-y-8 text-zinc-100">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href="/admin/users"
            className="mb-2 inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300"
          >
            <ChevronLeft className="h-3 w-3" /> Usuários
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold text-white">{user.email}</h1>
            {user.is_platform_admin && (
              <Badge className="border-amber-700 bg-amber-950/40 text-amber-300">
                <ShieldCheck className="h-3 w-3" /> Platform admin
              </Badge>
            )}
            {user.is_banned && (
              <Badge className="border-rose-700 bg-rose-950/40 text-rose-300">
                <AlertOctagon className="h-3 w-3" /> Banido
              </Badge>
            )}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-zinc-500">
            <span>
              ID: <code className="text-zinc-400">{user.id.slice(0, 8)}…</code>
            </span>
            <span>Provider: {user.provider}</span>
            {user.email_confirmed_at && <span>E-mail confirmado</span>}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <ImpersonateButton
            userId={user.id}
            userEmail={user.email}
            isPlatformAdmin={user.is_platform_admin}
          />
        </div>
      </div>

      <section className="grid gap-3 md:grid-cols-3">
        <InfoTile
          icon={Mail}
          label="E-mail confirmado"
          value={
            user.email_confirmed_at
              ? new Date(user.email_confirmed_at).toLocaleDateString("pt-BR")
              : "Não confirmado"
          }
        />
        <InfoTile
          icon={Calendar}
          label="Criado em"
          value={new Date(user.created_at).toLocaleString("pt-BR")}
        />
        <InfoTile
          icon={Activity}
          label="Último sign-in"
          value={
            user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString("pt-BR") : "Nunca"
          }
        />
      </section>

      <Card className="border-zinc-800 bg-zinc-900/30">
        <CardHeader>
          <CardTitle className="text-sm text-zinc-200">
            Organizações ({user.memberships.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {user.memberships.length === 0 ? (
            <p className="text-xs text-zinc-500">
              Este usuário não pertence a nenhuma organização.
            </p>
          ) : (
            <ul className="space-y-1.5">
              {user.memberships.map((m) => (
                <li
                  key={m.org_id}
                  className="flex items-center justify-between rounded-md border border-zinc-800/50 bg-zinc-950/40 px-2.5 py-2 text-sm"
                >
                  <div className="flex items-center gap-2">
                    <RoleIcon role={m.role} />
                    <Link
                      href={`/admin/organizations/${m.org_id}`}
                      className="text-zinc-200 hover:underline"
                    >
                      {m.org_name}
                    </Link>
                    <Badge className={PLAN_BADGE_COLORS[m.org_plano]}>
                      {PLANS[m.org_plano]?.label}
                    </Badge>
                    {m.is_suspended && (
                      <Badge className="border-rose-700 bg-rose-950/40 text-rose-300">
                        Suspensa
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-zinc-500">
                    <span className="capitalize">{m.role}</span>
                    {m.accepted_at && (
                      <span>desde {new Date(m.accepted_at).toLocaleDateString("pt-BR")}</span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card className="border-zinc-800 bg-zinc-900/30">
        <CardHeader>
          <CardTitle className="text-sm text-zinc-200">Audit log (ações deste usuário)</CardTitle>
        </CardHeader>
        <CardContent>
          {user.recent_audit.length === 0 ? (
            <p className="text-xs text-zinc-500">Nenhuma ação registrada no audit log.</p>
          ) : (
            <ul className="space-y-1">
              {user.recent_audit.slice(0, 30).map((a) => (
                <li
                  key={a.id}
                  className="rounded border border-zinc-800/50 bg-zinc-950/30 px-2 py-1 text-[11px]"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <code className="text-zinc-300">{a.action}</code>{" "}
                      <span className="text-zinc-500">
                        em {a.entity_type}
                        {a.entity_id ? ` ${a.entity_id.slice(0, 8)}…` : ""}
                      </span>
                    </div>
                    <span className="text-zinc-600">
                      {new Date(a.created_at).toLocaleString("pt-BR")}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function InfoTile({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Mail;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-zinc-800 bg-zinc-900/50 p-3">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-zinc-500" />
      <div>
        <div className="text-[11px] tracking-wide text-zinc-500 uppercase">{label}</div>
        <div className="mt-0.5 text-sm text-zinc-200">{value}</div>
      </div>
    </div>
  );
}

function RoleIcon({ role }: { role: "owner" | "admin" | "member" }) {
  if (role === "owner") return <Crown className="h-3.5 w-3.5 text-amber-400" />;
  if (role === "admin") return <ShieldIcon className="h-3.5 w-3.5 text-blue-400" />;
  return <UserIcon className="h-3.5 w-3.5 text-zinc-500" />;
}
