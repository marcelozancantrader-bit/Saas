import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/server";
import { formatBRL } from "@/lib/utils/money";
import { BudgetItemsTable } from "@/components/features/budgets/BudgetItemsTable";
import { BudgetHeader } from "@/components/features/budgets/BudgetHeader";
import { CurvaABC } from "@/components/features/budgets/CurvaABC";
import { ExportButtons } from "@/components/features/budgets/ExportButtons";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string; budgetId: string }> };

type BudgetDetail = {
  id: string;
  project_id: string;
  versao: number;
  uf: string;
  mes_referencia: string;
  desonerado: boolean;
  bdi_pct: string;
  total_bruto: string;
  total_com_bdi: string;
  observacoes: string | null;
  status: "rascunho" | "finalizado";
};

export type BudgetItem = {
  id: string;
  ordem: number;
  composicao_codigo: string | null;
  descricao: string;
  unidade: string;
  quantidade: string;
  preco_unitario: string;
  total: string;
  origem: "sinapi" | "custom" | "composicao_propria";
};

export default async function BudgetDetailPage({ params }: Props) {
  const { id: projectId, budgetId } = await params;
  const supabase = await createClient();

  const [{ data: budget, error: budgetErr }, { data: items }, { data: project }] =
    await Promise.all([
      supabase
        .from("budgets")
        .select(
          "id, project_id, versao, uf, mes_referencia, desonerado, bdi_pct, total_bruto, total_com_bdi, observacoes, status",
        )
        .eq("id", budgetId)
        .single<BudgetDetail>(),
      supabase
        .from("budget_items")
        .select(
          "id, ordem, composicao_codigo, descricao, unidade, quantidade, preco_unitario, total, origem",
        )
        .eq("budget_id", budgetId)
        .order("ordem", { ascending: true })
        .returns<BudgetItem[]>(),
      supabase.from("projects").select("nome").eq("id", projectId).single(),
    ]);

  if (budgetErr || !budget) notFound();
  if (budget.project_id !== projectId) notFound();

  const itemsList = items ?? [];

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/projetos/${projectId}/orcamento`}
          className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-50"
        >
          ← Orçamentos · {project?.nome ?? "Projeto"}
        </Link>
        <div className="mt-1 flex items-end justify-between gap-4">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">Orçamento v{budget.versao}</h1>
            <Badge variant={budget.status === "finalizado" ? "default" : "outline"}>
              {budget.status === "finalizado" ? "Finalizado" : "Rascunho"}
            </Badge>
          </div>
          <ExportButtons
            budget={budget}
            items={itemsList}
            projectName={project?.nome ?? "Projeto"}
          />
        </div>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          {budget.uf} · referência {budget.mes_referencia} ·{" "}
          {budget.desonerado ? "desonerado" : "não-desonerado"}
        </p>
      </div>

      <BudgetHeader budget={budget} />

      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Itens ({itemsList.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <BudgetItemsTable
              items={itemsList}
              budgetId={budgetId}
              uf={budget.uf}
              mesReferencia={budget.mes_referencia}
              desonerado={budget.desonerado}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Curva ABC</CardTitle>
          </CardHeader>
          <CardContent>
            <CurvaABC items={itemsList} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Totais</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm sm:grid-cols-3">
          <div>
            <p className="text-zinc-500">Total bruto (SINAPI)</p>
            <p className="text-lg font-semibold">{formatBRL(budget.total_bruto)}</p>
          </div>
          <div>
            <p className="text-zinc-500">BDI</p>
            <p className="text-lg font-semibold">{Number(budget.bdi_pct).toFixed(2)}%</p>
          </div>
          <div>
            <p className="text-zinc-500">Total final (c/ BDI)</p>
            <p className="text-lg font-semibold">{formatBRL(budget.total_com_bdi)}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
