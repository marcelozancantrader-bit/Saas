import { requirePlatformAdmin } from "@/lib/auth/platform-admin";
import { loadAdminHealth, formatBytes, formatUsd } from "@/server/services/admin-health";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { HealthRefreshButton } from "@/components/features/admin-shell/HealthRefreshButton";
import {
  Activity,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  CircleDashed,
  Sparkles,
  Database,
  AlertOctagon,
} from "lucide-react";

export const dynamic = "force-dynamic";

const STATUS_BADGE: Record<string, { color: string; icon: typeof CheckCircle2 }> = {
  ok: { color: "border-emerald-700 bg-emerald-950/40 text-emerald-300", icon: CheckCircle2 },
  warn: { color: "border-amber-700 bg-amber-950/40 text-amber-300", icon: AlertTriangle },
  error: { color: "border-rose-700 bg-rose-950/40 text-rose-300", icon: XCircle },
  disabled: { color: "border-zinc-700 bg-zinc-900 text-zinc-500", icon: CircleDashed },
};

export default async function HealthPage() {
  await requirePlatformAdmin();
  const h = await loadAdminHealth();

  return (
    <div className="space-y-6 text-zinc-100">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold text-white">
            <Activity className="h-6 w-6 text-amber-400" />
            Health da plataforma
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            Status das integrações, uso de Storage e custos de IA acumulados.
          </p>
        </div>
        <HealthRefreshButton />
      </div>

      <section className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        <KpiTile
          icon={Sparkles}
          label="Custo IA (30d)"
          value={formatUsd(h.aiCosts.last30dUsd)}
          sub={`${h.aiCosts.last30dCount} docs gerados`}
          accent
        />
        <KpiTile
          icon={Sparkles}
          label="Custo IA (total)"
          value={formatUsd(h.aiCosts.allTimeUsd)}
          sub={`${h.aiCosts.allTimeCount} docs total`}
        />
        <KpiTile
          icon={Database}
          label="Storage usado"
          value={formatBytes(h.storageUsedBytes)}
          sub={
            h.storageObjectCount !== null
              ? `${h.storageObjectCount.toLocaleString("pt-BR")} arquivos`
              : "indisponível"
          }
        />
        <KpiTile
          icon={AlertOctagon}
          label="Extrações com erro (24h)"
          value={h.recentErrors.toLocaleString("pt-BR")}
          sub={h.recentErrors > 0 ? "Investigar Inngest logs" : "Sem erros recentes"}
          tone={h.recentErrors > 0 ? "negative" : "positive"}
        />
      </section>

      <Card className="border-zinc-800 bg-zinc-900/30">
        <CardHeader>
          <CardTitle className="text-sm text-zinc-200">Integrações</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-1.5">
            {h.integrations.map((i) => {
              const badge = STATUS_BADGE[i.status] ?? STATUS_BADGE.disabled!;
              const Icon = badge.icon;
              return (
                <li
                  key={i.name}
                  className="flex items-center justify-between rounded-md border border-zinc-800/50 bg-zinc-950/40 px-3 py-2"
                >
                  <div className="flex items-center gap-3">
                    <Badge className={badge.color}>
                      <Icon className="h-3 w-3" />
                      {i.status}
                    </Badge>
                    <div>
                      <p className="text-sm text-zinc-200">{i.name}</p>
                      <p className="text-[11px] text-zinc-500">{i.detail}</p>
                    </div>
                  </div>
                  {!i.enabled && <span className="text-[11px] text-zinc-600">não configurado</span>}
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>

      <Card className="border-zinc-800 bg-zinc-900/30">
        <CardHeader>
          <CardTitle className="text-sm text-zinc-200">Próximos passos sugeridos</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-1 text-xs text-zinc-400">
            <li>
              <strong className="text-zinc-300">Resend:</strong> configure
              <code className="mx-1 text-amber-300">RESEND_API_KEY</code> +
              <code className="mx-1 text-amber-300">RESEND_FROM_EMAIL</code> pra ativar envio de
              e-mail no portal do cliente.
            </li>
            <li>
              <strong className="text-zinc-300">Sentry:</strong> configure
              <code className="mx-1 text-amber-300">SENTRY_DSN</code> pra rastreio de erros
              server-side.
            </li>
            <li>
              <strong className="text-zinc-300">PostHog:</strong> configure
              <code className="mx-1 text-amber-300">NEXT_PUBLIC_POSTHOG_KEY</code> +
              <code className="mx-1 text-amber-300">NEXT_PUBLIC_POSTHOG_HOST</code> pra analytics de
              ativação.
            </li>
            <li>
              <strong className="text-zinc-300">Asaas produção:</strong> hoje{" "}
              <code className="text-amber-300">sandbox</code>; pra cobrar de verdade, trocar
              <code className="mx-1 text-amber-300">ASAAS_ENVIRONMENT=production</code> + keys prod.
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

function KpiTile({
  icon: Icon,
  label,
  value,
  sub,
  accent,
  tone,
}: {
  icon: typeof Sparkles;
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
      <div className="flex items-center gap-2 text-[11px] tracking-wide text-zinc-500 uppercase">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <div className={`mt-1 text-2xl font-semibold ${accent ? "text-amber-300" : "text-zinc-100"}`}>
        {value}
      </div>
      <div className={`mt-1 text-[11px] ${subTone}`}>{sub}</div>
    </div>
  );
}
