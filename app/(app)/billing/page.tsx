import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrg } from "@/server/services/current-org";
import { getPlanUsage } from "@/server/services/plan-usage";
import { PLANS, formatBrlFromCents, type PlanId } from "@/lib/plans/limits";
import { PlanUpgradeButton } from "@/components/features/billing/PlanUpgradeButton";

export const dynamic = "force-dynamic";

export default async function BillingPage() {
  const org = await getCurrentOrg();
  const supabase = await createClient();

  const { data: orgRow } = await supabase
    .from("organizations")
    .select("plano")
    .eq("id", org.orgId)
    .single<{ plano: PlanId }>();
  const currentPlan = orgRow?.plano ?? "free";
  const usage = await getPlanUsage(org.orgId, currentPlan);

  const { data: subscriptions } = await supabase
    .from("subscriptions")
    .select(
      "id, plano, status, provider, current_period_start, current_period_end, cancel_at_period_end, created_at",
    )
    .eq("org_id", org.orgId)
    .order("created_at", { ascending: false })
    .limit(10);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Plano e cobrança</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Gerencie o plano da sua organização ({org.orgName}).
        </p>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Plano atual</CardTitle>
        </CardHeader>
        <CardContent className="flex items-end justify-between gap-4">
          <div>
            <p className="text-3xl font-semibold">{PLANS[currentPlan].label}</p>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              {PLANS[currentPlan].description}
            </p>
          </div>
          <p className="text-right text-sm">
            <span className="text-2xl font-semibold">
              {formatBrlFromCents(PLANS[currentPlan].priceCents)}
            </span>
            {PLANS[currentPlan].priceCents !== null && PLANS[currentPlan].priceCents! > 0 ? (
              <span className="ml-1 text-zinc-500">/mês</span>
            ) : null}
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {(["free", "pro", "studio", "agency"] as const).map((id) => {
          const plan = PLANS[id];
          const isCurrent = id === currentPlan;
          return (
            <Card key={id} className={isCurrent ? "ring-2 ring-zinc-900 dark:ring-zinc-100" : ""}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{plan.label}</CardTitle>
                  {isCurrent ? <Badge variant="default">Atual</Badge> : null}
                </div>
                <p className="text-sm">
                  <span className="text-xl font-semibold">
                    {formatBrlFromCents(plan.priceCents)}
                  </span>
                  {plan.priceCents !== null && plan.priceCents > 0 ? (
                    <span className="ml-1 text-xs text-zinc-500">/mês</span>
                  ) : null}
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                <ul className="space-y-1 text-xs text-zinc-700 dark:text-zinc-300">
                  {plan.features.map((f) => (
                    <li key={f} className="flex gap-1.5">
                      <span aria-hidden>•</span>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                {!isCurrent ? <PlanUpgradeButton targetPlan={id} /> : null}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Uso neste mês</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
          <UsageStat
            label="Projetos ativos"
            used={usage.activeProjects.used}
            limit={usage.activeProjects.limit}
          />
          <UsageStat
            label="Documentos IA"
            used={usage.monthlyAiDocs.used}
            limit={usage.monthlyAiDocs.limit}
          />
          <UsageStat label="Usuários" used={usage.users.used} limit={usage.users.limit} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Histórico de assinaturas</CardTitle>
        </CardHeader>
        <CardContent>
          {!subscriptions || subscriptions.length === 0 ? (
            <p className="text-sm text-zinc-500">
              Nenhuma assinatura registrada ainda. Faça upgrade acima para começar.
            </p>
          ) : (
            <ul className="space-y-2 text-sm">
              {subscriptions.map((s) => (
                <li key={s.id} className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">
                      {PLANS[s.plano as PlanId]?.label ?? s.plano}{" "}
                      <span className="text-xs text-zinc-500">· {s.provider}</span>
                    </p>
                    <p className="text-xs text-zinc-500">
                      {new Date(s.created_at as string).toLocaleDateString("pt-BR")}
                      {s.current_period_end
                        ? ` · até ${new Date(s.current_period_end as string).toLocaleDateString("pt-BR")}`
                        : null}
                      {s.cancel_at_period_end ? " · cancelamento agendado" : null}
                    </p>
                  </div>
                  <Badge variant={s.status === "active" ? "default" : "outline"}>{s.status}</Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function UsageStat({ label, used, limit }: { label: string; used: number; limit: number | null }) {
  return (
    <div>
      <p className="text-xs tracking-wider text-zinc-500 uppercase">{label}</p>
      <p className="mt-1 text-2xl font-semibold">
        {used}
        <span className="ml-1 text-sm text-zinc-500">
          {limit === null ? "· sem limite" : `/ ${limit}`}
        </span>
      </p>
    </div>
  );
}
