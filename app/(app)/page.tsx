import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const KPI_CARDS = [
  { label: "Projetos ativos", sprint: "Sprint 2" },
  { label: "Faturamento previsto", sprint: "Sprint 7" },
  { label: "Documentos pendentes", sprint: "Sprint 5" },
  { label: "Alterações de escopo", sprint: "Sprint 6" },
] as const;

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Visão geral do escritório. KPIs reais chegam no Sprint 7.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {KPI_CARDS.map((kpi) => (
          <Card key={kpi.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                {kpi.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-24" />
              <p className="mt-2 text-xs text-zinc-500">{kpi.sprint}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Próximos passos</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-zinc-600 dark:text-zinc-400">
          <ul className="list-disc space-y-1 pl-5">
            <li>Sprint 2: CRUD de Projetos e Clientes (com ViaCEP, validação CPF/CNPJ)</li>
            <li>Sprint 3: Extração de planta por IA (Claude Vision)</li>
            <li>Sprint 4: Orçamento SINAPI automatizado</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
