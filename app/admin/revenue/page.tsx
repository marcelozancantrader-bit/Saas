import Link from "next/link";
import { requirePlatformAdmin } from "@/lib/auth/platform-admin";
import { loadSaasOverviewMetrics } from "@/server/services/admin-metrics";
import { formatBrl, formatBrlCompact, formatPercent } from "@/lib/admin/saas-metrics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AdminCharts } from "@/components/features/admin-shell/AdminCharts";
import { TrendingUp } from "lucide-react";

export const dynamic = "force-dynamic";

const PLAN_COLORS: Record<string, string> = {
  free: "#71717a",
  solo: "#60a5fa",
  pro: "#fbbf24",
  studio: "#a78bfa",
  agency: "#34d399",
};

const PLAN_BADGE_COLORS: Record<string, string> = {
  free: "border-zinc-700 bg-zinc-800 text-zinc-300",
  solo: "border-blue-700 bg-blue-950/40 text-blue-300",
  pro: "border-amber-700 bg-amber-950/40 text-amber-300",
  studio: "border-violet-700 bg-violet-950/40 text-violet-300",
  agency: "border-emerald-700 bg-emerald-950/40 text-emerald-300",
};

export default async function RevenuePage() {
  await requirePlatformAdmin();
  const m = await loadSaasOverviewMetrics();

  const planChartData = m.planDistribution.map((p) => ({
    label: p.label,
    count: p.count,
    mrrLabel: p.mrrContributionCents > 0 ? formatBrl(p.mrrContributionCents) : "—",
    color: PLAN_COLORS[p.plano] ?? "#71717a",
  }));

  // Maior contribuidor de MRR
  const topMrrPlan = [...m.planDistribution].sort(
    (a, b) => b.mrrContributionCents - a.mrrContributionCents,
  )[0];

  return (
    <div className="space-y-8 text-zinc-100">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold text-white">
          <TrendingUp className="h-6 w-6 text-amber-400" />
          Receita
        </h1>
        <p className="mt-1 text-sm text-zinc-400">
          Métricas SaaS detalhadas. Para visão executiva, veja{" "}
          <Link href="/admin" className="text-amber-300 hover:underline">
            /admin
          </Link>
          .
        </p>
      </div>

      <section className="grid gap-3 md:grid-cols-4">
        <KpiCard
          label="MRR"
          value={formatBrlCompact(m.mrrCents)}
          sub={`${m.payingCustomers} clientes pagos`}
          accent
        />
        <KpiCard label="ARR" value={formatBrlCompact(m.arrCents)} sub="MRR × 12" accent />
        <KpiCard label="ARPU" value={formatBrlCompact(m.arpuCents)} sub="receita / cliente pago" />
        <KpiCard label="LTV" value={formatBrlCompact(m.ltvCents)} sub="ARPU / churn mensal" />
      </section>

      <section className="grid gap-3 md:grid-cols-3">
        <KpiCard
          label="Churn mensal"
          value={formatPercent(m.monthlyChurnRate)}
          sub={m.monthlyChurnRate <= 0.05 ? "Dentro do alvo (≤5%)" : "Acima do alvo"}
          tone={m.monthlyChurnRate <= 0.05 ? "positive" : "negative"}
        />
        <KpiCard
          label="Conversão Free→Pago"
          value={formatPercent(m.freeToPaidConversion)}
          sub="orgs com ≥7d"
        />
        <KpiCard
          label="Maior contribuidor"
          value={topMrrPlan?.label ?? "—"}
          sub={
            topMrrPlan && topMrrPlan.mrrContributionCents > 0
              ? `${formatBrl(topMrrPlan.mrrContributionCents)} de MRR`
              : "Sem clientes pagos ainda"
          }
        />
      </section>

      <AdminCharts mrrHistory={m.mrrHistory12m} planChartData={planChartData} />

      <Card className="border-zinc-800 bg-zinc-900/30">
        <CardHeader>
          <CardTitle className="text-sm text-zinc-200">Detalhamento por plano</CardTitle>
        </CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead className="text-xs tracking-wide text-zinc-500 uppercase">
              <tr>
                <th className="py-2 pr-2 text-left font-medium">Plano</th>
                <th className="py-2 pr-2 text-right font-medium">Orgs</th>
                <th className="py-2 pr-2 text-right font-medium">% do total</th>
                <th className="py-2 pr-2 text-right font-medium">MRR contribuído</th>
                <th className="py-2 pr-2 text-right font-medium">% do MRR</th>
              </tr>
            </thead>
            <tbody>
              {m.planDistribution.map((p) => {
                const pctOrgs = m.totalOrganizations ? p.count / m.totalOrganizations : 0;
                const pctMrr = m.mrrCents ? p.mrrContributionCents / m.mrrCents : 0;
                return (
                  <tr key={p.plano} className="border-t border-zinc-800/60">
                    <td className="py-2 pr-2">
                      <Badge className={PLAN_BADGE_COLORS[p.plano]}>{p.label}</Badge>
                    </td>
                    <td className="py-2 pr-2 text-right text-zinc-200 tabular-nums">{p.count}</td>
                    <td className="py-2 pr-2 text-right text-zinc-400 tabular-nums">
                      {formatPercent(pctOrgs, 0)}
                    </td>
                    <td className="py-2 pr-2 text-right text-zinc-200 tabular-nums">
                      {p.mrrContributionCents > 0 ? formatBrl(p.mrrContributionCents) : "—"}
                    </td>
                    <td className="py-2 pr-2 text-right text-zinc-400 tabular-nums">
                      {formatPercent(pctMrr, 0)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

function KpiCard({
  label,
  value,
  sub,
  accent,
  tone,
}: {
  label: string;
  value: string;
  sub: string;
  accent?: boolean;
  tone?: "positive" | "negative";
}) {
  const subTone =
    tone === "positive"
      ? "text-emerald-400"
      : tone === "negative"
        ? "text-rose-400"
        : "text-zinc-500";

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
      <div className="text-[11px] tracking-wide text-zinc-500 uppercase">{label}</div>
      <div className={`mt-1 text-2xl font-semibold ${accent ? "text-amber-300" : "text-zinc-100"}`}>
        {value}
      </div>
      <div className={`mt-1 text-[11px] ${subTone}`}>{sub}</div>
    </div>
  );
}
