"use client";

import dynamic from "next/dynamic";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatBrlCompact } from "@/lib/admin/saas-metrics";

// Recharts importado dinamicamente com ssr: false pra evitar crash durante
// o RSC pre-render do Next 16 + Turbopack. O lazy import só roda no client.
const MrrChart = dynamic(() => import("./MrrChart").then((m) => ({ default: m.MrrChart })), {
  ssr: false,
  loading: () => <ChartSkeleton />,
});

const PlanDistChart = dynamic(
  () => import("./PlanDistChart").then((m) => ({ default: m.PlanDistChart })),
  { ssr: false, loading: () => <ChartSkeleton /> },
);

type ChartPoint = { label: string; value: number; month?: string };
type PlanDatum = { label: string; count: number; mrrLabel: string; color: string };

type Props = {
  mrrHistory: ChartPoint[];
  signupsHistory?: ChartPoint[];
  planChartData: PlanDatum[];
};

export function AdminCharts({ mrrHistory, signupsHistory, planChartData }: Props) {
  return (
    <>
      <section className="grid gap-4 lg:grid-cols-2">
        <Card className="border-zinc-800 bg-zinc-900/50">
          <CardHeader>
            <CardTitle className="text-sm text-zinc-200">MRR — últimos 12 meses</CardTitle>
          </CardHeader>
          <CardContent>
            <MrrChart data={mrrHistory} formatter={(v) => formatBrlCompact(v)} />
          </CardContent>
        </Card>

        {signupsHistory ? (
          <Card className="border-zinc-800 bg-zinc-900/50">
            <CardHeader>
              <CardTitle className="text-sm text-zinc-200">Signups por mês</CardTitle>
            </CardHeader>
            <CardContent>
              <MrrChart data={signupsHistory} formatter={(v) => String(v)} color="#60a5fa" />
            </CardContent>
          </Card>
        ) : (
          <Card className="border-zinc-800 bg-zinc-900/50">
            <CardHeader>
              <CardTitle className="text-sm text-zinc-200">Distribuição de planos</CardTitle>
            </CardHeader>
            <CardContent>
              <PlanDistChart data={planChartData} />
            </CardContent>
          </Card>
        )}
      </section>

      {signupsHistory && (
        <section>
          <Card className="border-zinc-800 bg-zinc-900/50">
            <CardHeader>
              <CardTitle className="text-sm text-zinc-200">Distribuição de planos</CardTitle>
            </CardHeader>
            <CardContent>
              <PlanDistChart data={planChartData} />
            </CardContent>
          </Card>
        </section>
      )}
    </>
  );
}

function ChartSkeleton() {
  return (
    <div className="flex h-64 w-full items-center justify-center rounded-md border border-zinc-800 bg-zinc-950/30 text-xs text-zinc-500">
      Carregando gráfico…
    </div>
  );
}
