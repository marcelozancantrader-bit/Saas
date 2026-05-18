import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrg } from "@/server/services/current-org";
import { getDashboardMetrics } from "@/server/services/dashboard-metrics";
import { getPlanUsage } from "@/server/services/plan-usage";
import { getPlanInfo, type PlanId } from "@/lib/plans/limits";

export const dynamic = "force-dynamic";

function brl(cents: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function daysLabel(days: number | null): string {
  if (days === null) return "—";
  if (days < 1) return "<1 dia";
  if (days < 2) return "1 dia";
  return `${Math.round(days)} dias`;
}

export default async function DashboardPage() {
  const org = await getCurrentOrg();
  const supabase = await createClient();

  const [{ data: orgRow }, metrics, usage] = await Promise.all([
    supabase.from("organizations").select("plano").eq("id", org.orgId).single<{ plano: PlanId }>(),
    getDashboardMetrics(org.orgId),
    // usar plano free como fallback até a query resolver — plan info é estatico mesmo
    (async () => {
      const { data } = await supabase
        .from("organizations")
        .select("plano")
        .eq("id", org.orgId)
        .single<{ plano: PlanId }>();
      return getPlanUsage(org.orgId, data?.plano ?? "free");
    })(),
  ]);

  const planInfo = getPlanInfo(orgRow?.plano ?? "free");

  const KPI = [
    {
      label: "Projetos ativos",
      value: metrics.activeProjects.toString(),
      hint:
        planInfo.limits.maxActiveProjects !== null
          ? `de ${planInfo.limits.maxActiveProjects} no plano ${planInfo.label}`
          : "sem limite",
    },
    {
      label: "Faturamento previsto",
      value: brl(metrics.approvedRevenueCents),
      hint: "contratos aprovados pelos clientes",
    },
    {
      label: "Docs aguardando cliente",
      value: metrics.pendingDocuments.toString(),
      hint: "enviados ao portal sem decisão",
    },
    {
      label: "Alterações de escopo",
      value: metrics.pendingScopeChanges.toString(),
      hint: "aguardando ação",
    },
    {
      label: "Ciclo médio",
      value: daysLabel(metrics.avgCycleDays),
      hint: "projeto → primeira aprovação",
    },
    {
      label: "Projetos parados",
      value: metrics.staleProjects.toString(),
      hint: "sem atualização há 14+ dias",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            {org.orgName} · plano <strong>{planInfo.label}</strong>
          </p>
        </div>
        <Link
          href="/billing"
          className="text-sm text-zinc-700 underline-offset-2 hover:underline dark:text-zinc-300"
        >
          Gerenciar plano →
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {KPI.map((kpi) => (
          <Card key={kpi.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                {kpi.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{kpi.value}</p>
              <p className="mt-1 text-xs text-zinc-500">{kpi.hint}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Uso vs. limites do plano</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <UsageRow
            label="Projetos ativos"
            used={usage.activeProjects.used}
            limit={usage.activeProjects.limit}
          />
          <UsageRow
            label="Documentos IA neste mês"
            used={usage.monthlyAiDocs.used}
            limit={usage.monthlyAiDocs.limit}
          />
          <UsageRow label="Usuários" used={usage.users.used} limit={usage.users.limit} />
        </CardContent>
      </Card>
    </div>
  );
}

function UsageRow({ label, used, limit }: { label: string; used: number; limit: number | null }) {
  const isUnlimited = limit === null;
  const pct = isUnlimited ? 0 : Math.min(100, Math.round((used / Math.max(1, limit)) * 100));
  const exceeded = !isUnlimited && used >= (limit ?? Infinity);
  const warning = !isUnlimited && !exceeded && pct >= 80;

  return (
    <div>
      <div className="flex items-center justify-between text-xs">
        <span>{label}</span>
        <span className="text-zinc-500">
          {used}
          {isUnlimited ? " · sem limite" : ` / ${limit}`}
          {exceeded ? (
            <Badge variant="destructive" className="ml-2">
              Limite atingido
            </Badge>
          ) : warning ? (
            <Badge variant="secondary" className="ml-2">
              Próximo do limite
            </Badge>
          ) : null}
        </span>
      </div>
      {!isUnlimited ? (
        <div className="mt-1 h-1.5 w-full overflow-hidden rounded bg-zinc-100 dark:bg-zinc-800">
          <div
            className={
              exceeded
                ? "h-full bg-red-500"
                : warning
                  ? "h-full bg-amber-500"
                  : "h-full bg-zinc-900 dark:bg-zinc-100"
            }
            style={{ width: `${pct}%` }}
          />
        </div>
      ) : null}
    </div>
  );
}
