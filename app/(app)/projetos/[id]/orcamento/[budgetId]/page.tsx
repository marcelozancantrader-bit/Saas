import Link from "next/link";
import { notFound } from "next/navigation";
import Big from "big.js";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/server";
import { formatBRL, applyBdi, toDbNumeric } from "@/lib/utils/money";
import { BudgetItemsTable } from "@/components/features/budgets/BudgetItemsTable";
import { BudgetHeader } from "@/components/features/budgets/BudgetHeader";
import { CurvaABC } from "@/components/features/budgets/CurvaABC";
import { ExportButtons } from "@/components/features/budgets/ExportButtons";
import { RegenerateBudgetButton } from "@/components/features/budgets/RegenerateBudgetButton";
import { DISCIPLINA_LABEL, type Disciplina } from "@/lib/ai/prompts/_shared-extraction-schema";

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
  disciplina: Disciplina;
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
          "id, ordem, composicao_codigo, descricao, unidade, quantidade, preco_unitario, total, origem, disciplina",
        )
        .eq("budget_id", budgetId)
        .order("ordem", { ascending: true })
        .returns<BudgetItem[]>(),
      supabase.from("projects").select("nome").eq("id", projectId).single(),
    ]);

  if (budgetErr || !budget) notFound();
  if (budget.project_id !== projectId) notFound();

  const itemsList = items ?? [];

  const bdi = new Big(budget.bdi_pct);
  const subtotaisPorDisc = new Map<Disciplina, { bruto: Big; comBdi: Big; count: number }>();
  for (const it of itemsList) {
    const cur = subtotaisPorDisc.get(it.disciplina) ?? {
      bruto: new Big(0),
      comBdi: new Big(0),
      count: 0,
    };
    const total = new Big(it.total);
    cur.bruto = cur.bruto.plus(total);
    cur.comBdi = cur.comBdi.plus(applyBdi(total, Number(bdi)));
    cur.count += 1;
    subtotaisPorDisc.set(it.disciplina, cur);
  }
  const subtotaisOrdenados = (
    Array.from(subtotaisPorDisc.entries()) as Array<
      [Disciplina, { bruto: Big; comBdi: Big; count: number }]
    >
  ).sort((a, b) => b[1].comBdi.cmp(a[1].comBdi));

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/projetos/${projectId}/orcamento`}
          className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-50"
        >
          ← Orçamentos · {project?.nome ?? "Projeto"}
        </Link>
        <div className="mt-1 flex flex-col items-start gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
              Orçamento v{budget.versao}
            </h1>
            <Badge variant={budget.status === "finalizado" ? "default" : "outline"}>
              {budget.status === "finalizado" ? "Finalizado" : "Rascunho"}
            </Badge>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <RegenerateBudgetButton
              projectId={projectId}
              defaults={{
                uf: budget.uf,
                mes_referencia: budget.mes_referencia,
                desonerado: budget.desonerado,
                bdi_pct: Number(budget.bdi_pct),
              }}
            />
            <ExportButtons
              budget={budget}
              items={itemsList}
              projectName={project?.nome ?? "Projeto"}
            />
          </div>
        </div>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          {budget.uf} · referência {budget.mes_referencia} ·{" "}
          {budget.desonerado ? "desonerado" : "não-desonerado"}
        </p>
      </div>

      <BudgetHeader budget={budget} />

      {subtotaisOrdenados.length > 1 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Total por disciplina</CardTitle>
            <p className="text-xs text-zinc-600 dark:text-zinc-400">
              Quebra do orçamento por disciplina, com subtotal bruto e já com BDI aplicado.
            </p>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-zinc-50 text-xs text-zinc-500 uppercase dark:bg-zinc-900">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">Disciplina</th>
                    <th className="px-3 py-2 text-right font-medium">Itens</th>
                    <th className="px-3 py-2 text-right font-medium">Bruto</th>
                    <th className="px-3 py-2 text-right font-medium">c/ BDI</th>
                    <th className="px-3 py-2 text-right font-medium">% do total</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {subtotaisOrdenados.map(([disc, t]) => {
                    const pct = t.comBdi
                      .times(100)
                      .div(new Big(budget.total_com_bdi).eq(0) ? 1 : new Big(budget.total_com_bdi));
                    return (
                      <tr key={disc}>
                        <td className="px-3 py-2 font-medium">{DISCIPLINA_LABEL[disc]}</td>
                        <td className="px-3 py-2 text-right text-zinc-600 dark:text-zinc-400">
                          {t.count}
                        </td>
                        <td className="px-3 py-2 text-right text-zinc-600 dark:text-zinc-400">
                          {formatBRL(toDbNumeric(t.bruto))}
                        </td>
                        <td className="px-3 py-2 text-right font-medium">
                          {formatBRL(toDbNumeric(t.comBdi))}
                        </td>
                        <td className="px-3 py-2 text-right text-zinc-600 dark:text-zinc-400">
                          {pct.toFixed(1)}%
                        </td>
                      </tr>
                    );
                  })}
                  <tr className="bg-zinc-50 dark:bg-zinc-900">
                    <td className="px-3 py-2 text-sm font-semibold">Total consolidado</td>
                    <td className="px-3 py-2 text-right text-sm font-semibold">
                      {itemsList.length}
                    </td>
                    <td className="px-3 py-2 text-right text-sm font-semibold">
                      {formatBRL(budget.total_bruto)}
                    </td>
                    <td className="px-3 py-2 text-right text-sm font-semibold">
                      {formatBRL(budget.total_com_bdi)}
                    </td>
                    <td className="px-3 py-2 text-right text-sm font-semibold">100%</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : null}

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
