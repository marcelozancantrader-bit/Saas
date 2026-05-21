import Link from "next/link";
import { requirePlatformAdmin } from "@/lib/auth/platform-admin";
import { loadSaasOverviewMetrics, calculateGrowthDelta } from "@/server/services/admin-metrics";
import { formatBrl, formatBrlCompact, formatPercent } from "@/lib/admin/saas-metrics";
import { Badge } from "@/components/ui/badge";
import { AdminCharts } from "@/components/features/admin-shell/AdminCharts";
import {
  Building2,
  Users,
  CreditCard,
  TrendingUp,
  ScrollText,
  Flag,
  Megaphone,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
} from "lucide-react";

export const dynamic = "force-dynamic";

const PLAN_COLORS: Record<string, string> = {
  free: "#71717a",
  standard: "#60a5fa",
  pro: "#fbbf24",
  pro_max: "#a78bfa",
  agency: "#34d399",
};

const SECTIONS = [
  { href: "/admin/organizations", title: "Organizações", icon: Building2 },
  { href: "/admin/users", title: "Usuários", icon: Users },
  { href: "/admin/subscriptions", title: "Assinaturas", icon: CreditCard },
  { href: "/admin/revenue", title: "Receita", icon: TrendingUp },
  { href: "/admin/audit", title: "Auditoria", icon: ScrollText },
  { href: "/admin/feature-flags", title: "Feature flags", icon: Flag },
  { href: "/admin/announcements", title: "Anúncios", icon: Megaphone },
  { href: "/admin/health", title: "Health", icon: Activity },
];

export default async function AdminOverviewPage() {
  const me = await requirePlatformAdmin();

  let m: Awaited<ReturnType<typeof loadSaasOverviewMetrics>> | null = null;
  let loadError: { message: string; stack?: string } | null = null;
  try {
    m = await loadSaasOverviewMetrics();
  } catch (err) {
    loadError = {
      message: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
    };
    console.error("[admin] loadSaasOverviewMetrics failed:", err);
  }

  if (!m) {
    return (
      <div className="space-y-6 text-zinc-100">
        <h1 className="text-2xl font-semibold text-white">Visão geral do SaaS</h1>
        <div className="rounded-lg border border-rose-900/40 bg-rose-950/20 p-4 text-sm">
          <p className="font-medium text-rose-300">
            loadSaasOverviewMetrics falhou. Mensagem real do servidor:
          </p>
          <pre className="mt-2 max-h-[200px] overflow-auto rounded bg-zinc-950 p-3 text-xs break-words whitespace-pre-wrap text-rose-200">
            {loadError?.message ?? "(sem mensagem)"}
          </pre>
          {loadError?.stack && (
            <details className="mt-2 text-[11px]">
              <summary className="cursor-pointer text-zinc-400">Ver stack</summary>
              <pre className="mt-2 max-h-[400px] overflow-auto whitespace-pre-wrap text-zinc-500">
                {loadError.stack}
              </pre>
            </details>
          )}
        </div>
      </div>
    );
  }

  const signupsDelta = calculateGrowthDelta(m.newSignupsThisMonth, m.newSignupsPrevMonth);

  const planChartData = m.planDistribution.map((p) => ({
    label: p.label,
    count: p.count,
    mrrLabel: p.mrrContributionCents > 0 ? formatBrl(p.mrrContributionCents) : "—",
    color: PLAN_COLORS[p.plano] ?? "#71717a",
  }));

  return (
    <div className="space-y-8 text-zinc-100">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white">Visão geral do SaaS</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Olá, <span className="text-zinc-200">{me.email}</span>. Métricas globais da plataforma
            Memorial.ai.
          </p>
        </div>
        <Badge className="border-amber-500/20 bg-amber-500/10 text-amber-300">Platform admin</Badge>
      </div>

      <section>
        <h2 className="mb-3 text-xs font-semibold tracking-wide text-zinc-500 uppercase">
          Métricas SaaS
        </h2>
        <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-6">
          <KpiCard
            label="MRR"
            value={formatBrlCompact(m.mrrCents)}
            sub={`${m.payingCustomers} clientes pagos`}
            accent
          />
          <KpiCard label="ARR" value={formatBrlCompact(m.arrCents)} sub="MRR × 12" />
          <KpiCard label="ARPU" value={formatBrlCompact(m.arpuCents)} sub="por cliente pago" />
          <KpiCard
            label="Churn (mês)"
            value={formatPercent(m.monthlyChurnRate)}
            sub={m.monthlyChurnRate <= 0.05 ? "Dentro do alvo (≤5%)" : "Acima do alvo"}
            tone={m.monthlyChurnRate <= 0.05 ? "positive" : "negative"}
          />
          <KpiCard label="LTV" value={formatBrlCompact(m.ltvCents)} sub="ARPU / churn mensal" />
          <KpiCard
            label="Conversão F→P"
            value={formatPercent(m.freeToPaidConversion)}
            sub="orgs com 7d+"
          />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-xs font-semibold tracking-wide text-zinc-500 uppercase">Volume</h2>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            label="Organizações"
            value={m.totalOrganizations.toLocaleString("pt-BR")}
            sub={`${m.paidOrganizations} pagas · ${m.freeOrganizations} free`}
          />
          <KpiCard
            label="Usuários"
            value={m.totalUsers.toLocaleString("pt-BR")}
            sub="memberships totais"
          />
          <KpiCard
            label="Projetos"
            value={m.totalProjects.toLocaleString("pt-BR")}
            sub="total na plataforma"
          />
          <KpiCard
            label="Docs IA (mês)"
            value={m.totalDocsThisMonth.toLocaleString("pt-BR")}
            sub="documentos gerados"
          />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-xs font-semibold tracking-wide text-zinc-500 uppercase">
          Crescimento
        </h2>
        <div className="grid gap-3 md:grid-cols-3">
          <KpiCard
            label="Signups este mês"
            value={m.newSignupsThisMonth.toLocaleString("pt-BR")}
            sub={
              signupsDelta === 0
                ? "= mês anterior"
                : signupsDelta > 0
                  ? `+${formatPercent(signupsDelta, 0)} vs mês anterior`
                  : `${formatPercent(signupsDelta, 0)} vs mês anterior`
            }
            delta={signupsDelta}
          />
          <KpiCard
            label="Signups mês anterior"
            value={m.newSignupsPrevMonth.toLocaleString("pt-BR")}
            sub="referência"
          />
          <KpiCard
            label="Net ARR"
            value={formatBrlCompact(m.arrCents)}
            sub="receita anualizada projetada"
            accent
          />
        </div>
      </section>

      <AdminCharts
        mrrHistory={m.mrrHistory12m}
        signupsHistory={m.signupsHistory12m}
        planChartData={planChartData}
      />

      <section>
        <h2 className="mb-3 text-xs font-semibold tracking-wide text-zinc-500 uppercase">
          Acessar
        </h2>
        <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-4">
          {SECTIONS.map((s) => {
            const Icon = s.icon;
            return (
              <Link
                key={s.href}
                href={s.href}
                className="group flex items-center gap-2.5 rounded-lg border border-zinc-800 bg-zinc-900/30 px-3 py-2.5 text-sm text-zinc-300 transition hover:border-zinc-700 hover:bg-zinc-900 hover:text-white"
              >
                <Icon className="h-4 w-4 text-amber-400" />
                <span className="flex-1">{s.title}</span>
                <ArrowUpRight className="h-3.5 w-3.5 text-zinc-600 transition group-hover:text-amber-400" />
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function KpiCard({
  label,
  value,
  sub,
  accent,
  tone,
  delta,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
  tone?: "positive" | "negative";
  delta?: number;
}) {
  const subTone =
    tone === "positive"
      ? "text-emerald-400"
      : tone === "negative"
        ? "text-rose-400"
        : "text-zinc-500";

  const DeltaIcon =
    delta === undefined ? null : delta > 0 ? ArrowUpRight : delta < 0 ? ArrowDownRight : Minus;

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
      <div className="text-[11px] tracking-wide text-zinc-500 uppercase">{label}</div>
      <div className={`mt-1 text-2xl font-semibold ${accent ? "text-amber-300" : "text-zinc-100"}`}>
        {value}
      </div>
      {sub && (
        <div className={`mt-1 flex items-center gap-1 text-[11px] ${subTone}`}>
          {DeltaIcon && delta !== undefined && delta !== 0 && (
            <DeltaIcon className={`h-3 w-3 ${delta > 0 ? "text-emerald-400" : "text-rose-400"}`} />
          )}
          <span>{sub}</span>
        </div>
      )}
    </div>
  );
}
