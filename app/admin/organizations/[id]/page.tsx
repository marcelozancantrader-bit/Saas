import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePlatformAdmin } from "@/lib/auth/platform-admin";
import { loadAdminOrgDetail } from "@/server/services/admin-orgs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChangePlanDialog } from "@/components/features/admin-shell/ChangePlanDialog";
import { SuspendOrgDialog } from "@/components/features/admin-shell/SuspendOrgDialog";
import { PLANS, type PlanId, formatBrlFromCents } from "@/lib/plans/limits";
import { formatBrl } from "@/lib/admin/saas-metrics";
import { ChevronLeft, AlertOctagon, ExternalLink, Crown, Shield, User } from "lucide-react";

export const dynamic = "force-dynamic";

const PLAN_BADGE_COLORS: Record<PlanId, string> = {
  free: "border-zinc-700 bg-zinc-800 text-zinc-300",
  solo: "border-blue-700 bg-blue-950/40 text-blue-300",
  pro: "border-amber-700 bg-amber-950/40 text-amber-300",
  studio: "border-violet-700 bg-violet-950/40 text-violet-300",
  agency: "border-emerald-700 bg-emerald-950/40 text-emerald-300",
};

const SUB_STATUS_COLORS: Record<string, string> = {
  active: "border-emerald-700 bg-emerald-950/40 text-emerald-300",
  past_due: "border-amber-700 bg-amber-950/40 text-amber-300",
  canceled: "border-zinc-700 bg-zinc-900 text-zinc-400",
  trialing: "border-blue-700 bg-blue-950/40 text-blue-300",
  pending: "border-zinc-700 bg-zinc-900 text-zinc-400",
};

const PROJECT_STATUS_LABELS: Record<string, string> = {
  rascunho: "Rascunho",
  em_andamento: "Em andamento",
  aguardando_cliente: "Aguardando cliente",
  concluido: "Concluído",
  arquivado: "Arquivado",
};

export default async function OrgDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePlatformAdmin();
  const { id } = await params;

  const org = await loadAdminOrgDetail(id);
  if (!org) notFound();

  return (
    <div className="space-y-8 text-zinc-100">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href="/admin/organizations"
            className="mb-2 inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300"
          >
            <ChevronLeft className="h-3 w-3" /> Organizações
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold text-white">{org.name}</h1>
            <Badge className={PLAN_BADGE_COLORS[org.plano]}>{org.plano_label}</Badge>
            {org.is_suspended && (
              <Badge className="border-rose-700 bg-rose-950/40 text-rose-300">
                <AlertOctagon className="h-3 w-3" /> Suspensa
              </Badge>
            )}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-zinc-500">
            <span>
              ID: <code className="text-zinc-400">{org.id.slice(0, 8)}…</code>
            </span>
            {org.cnpj && <span>CNPJ: {org.cnpj}</span>}
            <span>Criada em {new Date(org.created_at).toLocaleDateString("pt-BR")}</span>
            {org.plano_price_cents !== null && org.plano_price_cents > 0 && (
              <span>Plano atual: {formatBrlFromCents(org.plano_price_cents)}/mês</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <ChangePlanDialog orgId={org.id} currentPlan={org.plano} />
          <SuspendOrgDialog orgId={org.id} isSuspended={org.is_suspended} />
        </div>
      </div>

      {org.is_suspended && (
        <div className="rounded-lg border border-rose-900/40 bg-rose-950/20 p-4 text-sm">
          <div className="flex items-start gap-2">
            <AlertOctagon className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
            <div>
              <p className="font-medium text-rose-300">Organização suspensa</p>
              {org.suspended_at && (
                <p className="mt-1 text-xs text-rose-200/80">
                  Em {new Date(org.suspended_at).toLocaleString("pt-BR")} —{" "}
                  <span className="italic">{org.suspended_reason ?? "sem motivo registrado"}</span>
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      <section className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
        <KpiTile label="Membros" value={org.member_count} />
        <KpiTile label="Projetos" value={org.project_count} />
        <KpiTile label="Clientes" value={org.client_count} />
        <KpiTile label="Docs IA total" value={org.doc_count_total} />
        <KpiTile label="Docs IA (mês)" value={org.doc_count_this_month} accent />
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-zinc-800 bg-zinc-900/30">
          <CardHeader>
            <CardTitle className="text-sm text-zinc-200">Membros ({org.member_count})</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1.5">
              {org.members.length === 0 && (
                <li className="text-xs text-zinc-500">Sem membros cadastrados.</li>
              )}
              {org.members.map((m) => (
                <li
                  key={m.user_id}
                  className="flex items-center justify-between rounded-md border border-zinc-800/50 bg-zinc-950/40 px-2.5 py-1.5 text-sm"
                >
                  <div className="flex items-center gap-2">
                    <RoleIcon role={m.role} />
                    <span className="text-zinc-200">
                      {m.email ?? <em className="text-zinc-500">sem e-mail</em>}
                    </span>
                    <Badge variant="outline" className="text-[10px]">
                      {m.role}
                    </Badge>
                  </div>
                  <span className="text-[11px] text-zinc-500">
                    {m.accepted_at
                      ? new Date(m.accepted_at).toLocaleDateString("pt-BR")
                      : "pendente"}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card className="border-zinc-800 bg-zinc-900/30">
          <CardHeader>
            <CardTitle className="text-sm text-zinc-200">
              Histórico de assinaturas ({org.subscriptions.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1.5">
              {org.subscriptions.length === 0 && (
                <li className="text-xs text-zinc-500">Sem assinaturas registradas.</li>
              )}
              {org.subscriptions.slice(0, 10).map((s) => (
                <li
                  key={s.id}
                  className="rounded-md border border-zinc-800/50 bg-zinc-950/40 px-2.5 py-1.5 text-sm"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <Badge className={PLAN_BADGE_COLORS[s.plano]}>
                        {PLANS[s.plano]?.label ?? s.plano}
                      </Badge>
                      <Badge
                        className={
                          SUB_STATUS_COLORS[s.status] ?? "border-zinc-700 bg-zinc-900 text-zinc-400"
                        }
                      >
                        {s.status}
                      </Badge>
                      <span className="text-[11px] text-zinc-500">{s.provider}</span>
                    </div>
                    <span className="text-[11px] text-zinc-500">
                      {new Date(s.created_at).toLocaleDateString("pt-BR")}
                    </span>
                  </div>
                  {s.meta?.reason ? (
                    <p className="mt-1 text-[11px] text-zinc-500 italic">{String(s.meta.reason)}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      <Card className="border-zinc-800 bg-zinc-900/30">
        <CardHeader>
          <CardTitle className="text-sm text-zinc-200">
            Projetos recentes ({org.project_count})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {org.projects.length === 0 ? (
            <p className="text-xs text-zinc-500">Esta organização ainda não criou projetos.</p>
          ) : (
            <table className="w-full text-xs">
              <thead className="text-[10px] tracking-wide text-zinc-500 uppercase">
                <tr>
                  <th className="py-1 pr-2 text-left font-medium">Nome</th>
                  <th className="py-1 pr-2 text-left font-medium">Tipologia</th>
                  <th className="py-1 pr-2 text-left font-medium">Status</th>
                  <th className="py-1 pr-2 text-left font-medium">Padrão</th>
                  <th className="py-1 pr-2 text-right font-medium">Contrato</th>
                  <th className="py-1 pr-2 text-left font-medium">Atualizado</th>
                </tr>
              </thead>
              <tbody>
                {org.projects.slice(0, 20).map((p) => (
                  <tr key={p.id} className="border-t border-zinc-800/60">
                    <td className="py-1.5 pr-2 text-zinc-200">{p.nome}</td>
                    <td className="py-1.5 pr-2 text-zinc-400 capitalize">{p.tipologia}</td>
                    <td className="py-1.5 pr-2 text-zinc-400">
                      {PROJECT_STATUS_LABELS[p.status] ?? p.status}
                    </td>
                    <td className="py-1.5 pr-2 text-zinc-400 capitalize">
                      {p.padrao_construtivo ?? "—"}
                    </td>
                    <td className="py-1.5 pr-2 text-right text-zinc-300 tabular-nums">
                      {p.valor_contrato
                        ? formatBrl(Math.round(Number(p.valor_contrato) * 100))
                        : "—"}
                    </td>
                    <td className="py-1.5 pr-2 text-zinc-500">
                      {new Date(p.updated_at).toLocaleDateString("pt-BR")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <Card className="border-zinc-800 bg-zinc-900/30">
        <CardHeader>
          <CardTitle className="text-sm text-zinc-200">
            Auditoria recente ({org.recent_audit.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {org.recent_audit.length === 0 ? (
            <p className="text-xs text-zinc-500">Sem entradas no audit log.</p>
          ) : (
            <ul className="space-y-1">
              {org.recent_audit.slice(0, 20).map((a) => (
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
                  <div className="text-zinc-500">
                    {a.actor_type === "platform_admin" ? (
                      <span className="text-amber-400">platform admin</span>
                    ) : (
                      a.actor_type
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <section className="rounded-lg border border-zinc-800 bg-zinc-900/30 p-4 text-xs text-zinc-500">
        <p>
          <ExternalLink className="-mt-0.5 mr-1 inline-block h-3 w-3" />
          Para impersonate do owner desta organização e ver o que o cliente vê, aguarde Fase 4
          (Users management + impersonation).
        </p>
      </section>
    </div>
  );
}

function KpiTile({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
      <div className="text-[11px] tracking-wide text-zinc-500 uppercase">{label}</div>
      <div className={`mt-1 text-2xl font-semibold ${accent ? "text-amber-300" : "text-zinc-100"}`}>
        {value.toLocaleString("pt-BR")}
      </div>
    </div>
  );
}

function RoleIcon({ role }: { role: "owner" | "admin" | "member" }) {
  if (role === "owner") return <Crown className="h-3.5 w-3.5 text-amber-400" />;
  if (role === "admin") return <Shield className="h-3.5 w-3.5 text-blue-400" />;
  return <User className="h-3.5 w-3.5 text-zinc-500" />;
}
