import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrg } from "@/server/services/current-org";
import { getDashboardMetrics } from "@/server/services/dashboard-metrics";
import { getPlanUsage } from "@/server/services/plan-usage";
import { getPlanInfo, type PlanId } from "@/lib/plans/limits";
import { WelcomeCard } from "@/components/features/onboarding/WelcomeCard";
import { OnboardingChecklist } from "@/components/features/onboarding/OnboardingChecklist";
import { OnboardingTour } from "@/components/features/onboarding/OnboardingTour";
import { getOnboardingProgress } from "@/server/services/onboarding-progress";
import { Sparkline } from "@/components/features/dashboard/Sparkline";
import { KpiTile } from "@/components/features/dashboard/KpiTile";
import {
  Briefcase,
  Wallet,
  Send,
  GitPullRequestArrow,
  Clock,
  AlertOctagon,
  Plus,
  Sparkles,
  TrendingUp,
  ArrowUpRight,
} from "lucide-react";

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

function greeting(): string {
  const h = new Date().getHours();
  if (h < 6) return "Boa madrugada";
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

const PLAN_BADGE_TONE: Record<PlanId, string> = {
  free: "border-zinc-200 bg-zinc-100 text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  solo: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-300",
  pro: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300",
  studio:
    "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900 dark:bg-violet-950/40 dark:text-violet-300",
  agency:
    "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300",
};

export default async function DashboardPage() {
  const org = await getCurrentOrg();
  const supabase = await createClient();

  const [{ data: orgRow }, metrics, usage, { data: userRow }, onboarding] = await Promise.all([
    supabase.from("organizations").select("plano").eq("id", org.orgId).single<{ plano: PlanId }>(),
    getDashboardMetrics(org.orgId),
    (async () => {
      const { data } = await supabase
        .from("organizations")
        .select("plano")
        .eq("id", org.orgId)
        .single<{ plano: PlanId }>();
      return getPlanUsage(org.orgId, data?.plano ?? "free");
    })(),
    supabase.auth.getUser().then((res) => ({ data: res.data.user })),
    getOnboardingProgress(org.orgId),
  ]);

  // Mostra checklist quando: já tem ao menos 1 projeto (WelcomeCard sumiu),
  // não foi dispensado, e ainda há passo pendente OU acabou de completar.
  const showOnboardingChecklist = onboarding.steps[0]?.done === true && !onboarding.dismissedAt;

  const planInfo = getPlanInfo(orgRow?.plano ?? "free");
  const userName =
    (userRow?.user_metadata?.full_name as string | undefined) ??
    userRow?.email?.split("@")[0] ??
    "você";
  const firstName = userName.split(" ")[0];

  // Insights derivados pro sparkline section
  const total30d = metrics.createdLast30d;
  const peakDay = Math.max(0, ...metrics.createdPerDay30d);
  const avgPerWeek = (total30d / 30) * 7;

  return (
    <div className="space-y-8">
      {/* ============== HEADER ============== */}
      <header className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-medium tracking-wider text-zinc-500 uppercase dark:text-zinc-400">
            {greeting()}, {firstName}
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Painel do escritório
          </h1>
          <div className="mt-1.5 flex flex-wrap items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
            <span>{org.orgName}</span>
            <span className="text-zinc-400">·</span>
            <Badge className={`${PLAN_BADGE_TONE[orgRow?.plano ?? "free"]} font-medium`}>
              <Sparkles className="h-3 w-3" />
              {planInfo.label}
            </Badge>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/billing"
            className="text-sm text-zinc-600 underline-offset-2 hover:underline dark:text-zinc-300"
          >
            Gerenciar plano
          </Link>
          <Button
            render={
              <Link href="/projetos/novo">
                <Plus className="mr-1.5 h-4 w-4" />
                Novo projeto
              </Link>
            }
          />
        </div>
      </header>

      <OnboardingTour shouldShow={!onboarding.tourCompletedAt} />

      {metrics.activeProjects === 0 ? <WelcomeCard /> : null}

      {showOnboardingChecklist ? <OnboardingChecklist progress={onboarding} /> : null}

      {/* ============== KPI GRID ============== */}
      <section>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <KpiTile
            tone="blue"
            icon={Briefcase}
            label="Projetos ativos"
            value={metrics.activeProjects.toString()}
            hint={
              planInfo.limits.maxActiveProjects !== null
                ? `de ${planInfo.limits.maxActiveProjects} no plano ${planInfo.label}`
                : "ilimitado no seu plano"
            }
            href="/projetos?status=em_andamento"
          />
          <KpiTile
            tone="emerald"
            icon={Wallet}
            label="Faturamento previsto"
            value={brl(metrics.approvedRevenueCents)}
            hint="contratos aprovados pelos clientes"
            href="/projetos?status=concluido"
          />
          <KpiTile
            tone="amber"
            icon={Send}
            label="Docs aguardando cliente"
            value={metrics.pendingDocuments.toString()}
            hint="enviados ao portal sem decisão"
            href="/projetos?status=aguardando_cliente"
          />
          <KpiTile
            tone="violet"
            icon={GitPullRequestArrow}
            label="Alterações de escopo"
            value={metrics.pendingScopeChanges.toString()}
            hint="aguardando sua precificação"
          />
          <KpiTile
            tone="zinc"
            icon={Clock}
            label="Ciclo médio"
            value={daysLabel(metrics.avgCycleDays)}
            hint="projeto → primeira aprovação"
          />
          <KpiTile
            tone={metrics.staleProjects > 0 ? "rose" : "zinc"}
            icon={AlertOctagon}
            label="Projetos parados"
            value={metrics.staleProjects.toString()}
            hint="sem atualização há 14+ dias"
            href="/projetos"
          />
        </div>
      </section>

      {/* ============== SPARKLINE + USAGE ============== */}
      <section className="grid gap-4 lg:grid-cols-3">
        {/* Sparkline (2 cols) */}
        <Card className="border-zinc-200 bg-gradient-to-br from-white via-white to-blue-50/30 shadow-sm lg:col-span-2 dark:border-zinc-800 dark:from-zinc-900 dark:via-zinc-900 dark:to-blue-950/20">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-950/40">
                  <TrendingUp className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </span>
                <CardTitle className="text-base">Projetos criados</CardTitle>
              </div>
              <span className="text-xs text-zinc-500">Últimos 30 dias</span>
            </div>
          </CardHeader>
          <CardContent>
            {total30d > 0 ? (
              <>
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <p className="text-4xl font-semibold text-zinc-900 tabular-nums dark:text-zinc-50">
                      {total30d}
                    </p>
                    <p className="mt-1 text-xs text-zinc-500">
                      {total30d === 1 ? "projeto criado" : "projetos criados"}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-right text-xs">
                    <div>
                      <p className="text-zinc-500">Pico/dia</p>
                      <p className="font-semibold text-zinc-800 tabular-nums dark:text-zinc-200">
                        {peakDay}
                      </p>
                    </div>
                    <div>
                      <p className="text-zinc-500">Média/sem.</p>
                      <p className="font-semibold text-zinc-800 tabular-nums dark:text-zinc-200">
                        {avgPerWeek.toFixed(1)}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="mt-4">
                  <Sparkline data={metrics.createdPerDay30d} height={72} />
                </div>
                <div className="mt-1 flex justify-between text-[10px] text-zinc-400">
                  <span>30 dias atrás</span>
                  <span>Hoje</span>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center py-6 text-center">
                <Briefcase className="h-8 w-8 text-zinc-400" />
                <p className="mt-3 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Sem projetos novos nos últimos 30 dias
                </p>
                <p className="mt-1 text-xs text-zinc-500">
                  Crie um projeto pra começar a popular o histórico.
                </p>
                <Button
                  size="sm"
                  className="mt-3"
                  render={<Link href="/projetos/novo">+ Criar projeto</Link>}
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Usage card (1 col) */}
        <Card className="border-zinc-200 shadow-sm dark:border-zinc-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Uso do plano</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <UsageRow
              label="Projetos ativos"
              used={usage.activeProjects.used}
              limit={usage.activeProjects.limit}
            />
            <UsageRow
              label="Docs IA neste mês"
              used={usage.monthlyAiDocs.used}
              limit={usage.monthlyAiDocs.limit}
            />
            <UsageRow label="Usuários" used={usage.users.used} limit={usage.users.limit} />

            <div className="border-t border-zinc-200 pt-3 dark:border-zinc-800">
              <Link
                href="/billing"
                className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 hover:underline dark:text-blue-400"
              >
                Ver planos e upgrade <ArrowUpRight className="h-3 w-3" />
              </Link>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* ============== ATALHOS ============== */}
      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-xs font-semibold tracking-wider text-zinc-500 uppercase">
            Atalhos rápidos
          </h2>
          <p className="text-[11px] text-zinc-500">
            Pressione{" "}
            <kbd className="rounded border border-zinc-300 bg-zinc-100 px-1 font-mono text-[10px] dark:border-zinc-700 dark:bg-zinc-800">
              ⌘K
            </kbd>{" "}
            para abrir a paleta de comandos
          </p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <ShortcutCard
            href="/projetos/novo"
            label="Novo projeto"
            sub="Crie em segundos"
            icon={Plus}
            tone="blue"
          />
          <ShortcutCard
            href="/clientes/novo"
            label="Novo cliente"
            sub="Pessoa física ou jurídica"
            icon={Plus}
            tone="emerald"
          />
          <ShortcutCard
            href="/projetos"
            label="Ver projetos"
            sub="Lista completa com filtros"
            icon={Briefcase}
            tone="violet"
          />
          <ShortcutCard
            href="/configuracoes"
            label="Personalizar branding"
            sub="Logo, cores, dados profissionais"
            icon={Sparkles}
            tone="amber"
          />
        </div>
      </section>
    </div>
  );
}

function UsageRow({ label, used, limit }: { label: string; used: number; limit: number | null }) {
  const isUnlimited = limit === null;
  const pct = isUnlimited ? 0 : Math.min(100, Math.round((used / Math.max(1, limit)) * 100));
  const exceeded = !isUnlimited && used >= (limit ?? Infinity);
  const warning = !isUnlimited && !exceeded && pct >= 80;

  const barColor = exceeded
    ? "bg-rose-500"
    : warning
      ? "bg-amber-500"
      : "bg-gradient-to-r from-blue-500 to-blue-600";

  return (
    <div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-zinc-700 dark:text-zinc-300">{label}</span>
        <span className="text-zinc-500 tabular-nums">
          {used}
          {isUnlimited ? " · sem limite" : ` / ${limit}`}
        </span>
      </div>
      {!isUnlimited ? (
        <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
          <div className={`h-full ${barColor} transition-all`} style={{ width: `${pct}%` }} />
        </div>
      ) : (
        <div className="mt-1.5 h-1.5 w-full rounded-full bg-gradient-to-r from-emerald-200 to-emerald-100 dark:from-emerald-900/40 dark:to-emerald-950/40" />
      )}
      {(exceeded || warning) && (
        <p
          className={`mt-1 text-[10px] font-medium ${
            exceeded ? "text-rose-600 dark:text-rose-400" : "text-amber-700 dark:text-amber-400"
          }`}
        >
          {exceeded ? "Limite atingido — considere upgrade" : "Próximo do limite"}
        </p>
      )}
    </div>
  );
}

function ShortcutCard({
  href,
  label,
  sub,
  icon: Icon,
  tone,
}: {
  href: string;
  label: string;
  sub: string;
  icon: typeof Plus;
  tone: "blue" | "emerald" | "violet" | "amber";
}) {
  const map = {
    blue: "bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400",
    emerald: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400",
    violet: "bg-violet-50 text-violet-600 dark:bg-violet-950/40 dark:text-violet-400",
    amber: "bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400",
  };
  return (
    <Link
      href={href}
      className="group flex items-center gap-3 rounded-lg border border-zinc-200 bg-white p-3 shadow-sm transition-all hover:-translate-y-0.5 hover:border-zinc-300 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900"
    >
      <span
        className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${map[tone]}`}
      >
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{label}</p>
        <p className="truncate text-[11px] text-zinc-500">{sub}</p>
      </div>
      <ArrowUpRight className="h-4 w-4 text-zinc-400 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
    </Link>
  );
}
