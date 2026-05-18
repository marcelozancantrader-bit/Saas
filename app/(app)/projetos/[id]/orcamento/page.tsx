import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { createClient } from "@/lib/supabase/server";
import { formatBRL } from "@/lib/utils/money";
import { GenerateBudgetButton } from "@/components/features/budgets/GenerateBudgetButton";
import { BudgetDisciplinasCard } from "@/components/features/budgets/BudgetDisciplinasCard";
import type { Disciplina } from "@/lib/ai/prompts/_shared-extraction-schema";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

type BudgetRow = {
  id: string;
  versao: number;
  uf: string;
  mes_referencia: string;
  desonerado: boolean;
  bdi_pct: string;
  total_bruto: string;
  total_com_bdi: string;
  status: "rascunho" | "finalizado";
  created_at: string;
};

export default async function OrcamentosPage({ params }: Props) {
  const { id: projectId } = await params;
  const supabase = await createClient();

  const { data: project, error } = await supabase
    .from("projects")
    .select("id, nome, meta")
    .eq("id", projectId)
    .single();
  if (error || !project) notFound();

  const { data: budgets } = await supabase
    .from("budgets")
    .select(
      "id, versao, uf, mes_referencia, desonerado, bdi_pct, total_bruto, total_com_bdi, status, created_at",
    )
    .eq("project_id", projectId)
    .order("versao", { ascending: false })
    .returns<BudgetRow[]>();

  const extracao = (project.meta as Record<string, unknown> | null)?.extracao_planta as
    | { confirmed_by_user?: boolean; area_total_m2?: number | null }
    | undefined;
  const canGenerate = !!extracao?.confirmed_by_user && !!extracao.area_total_m2;

  const extracoesDisciplinas = ((project.meta as Record<string, unknown> | null)
    ?.extracoes_disciplinas ?? {}) as Partial<
    Record<Disciplina, { data?: Record<string, unknown>; confirmed_by_user?: boolean }>
  >;

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/projetos/${projectId}`}
          className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-50"
        >
          ← {project.nome}
        </Link>
        <div className="mt-1 flex items-end justify-between gap-4">
          <h1 className="text-2xl font-semibold tracking-tight">Orçamentos</h1>
          <GenerateBudgetButton projectId={projectId} canGenerate={canGenerate} />
        </div>
      </div>

      {!canGenerate ? (
        <Card>
          <CardContent className="p-4 text-sm text-zinc-600 dark:text-zinc-400">
            Confirme a extração da planta primeiro (faça upload do PDF na aba Arquivos do projeto e
            clique em Confirmar na seção Extração). O orçamento usa esses dados para estimar
            quantitativos.
          </CardContent>
        </Card>
      ) : null}

      <BudgetDisciplinasCard extracoes={extracoesDisciplinas} />

      {!budgets || budgets.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-zinc-500">
            Nenhum orçamento gerado ainda.
            {canGenerate ? (
              <p className="mt-2">
                Clique em &quot;Gerar orçamento&quot; acima para criar a versão 1.
              </p>
            ) : null}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Versões</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Versão</TableHead>
                  <TableHead>UF / Mês</TableHead>
                  <TableHead>BDI</TableHead>
                  <TableHead className="text-right">Total bruto</TableHead>
                  <TableHead className="text-right">Total c/ BDI</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {budgets.map((b) => (
                  <TableRow key={b.id}>
                    <TableCell className="font-medium">v{b.versao}</TableCell>
                    <TableCell className="text-sm text-zinc-600 dark:text-zinc-400">
                      {b.uf} · {b.mes_referencia} · {b.desonerado ? "desonerado" : "não-desonerado"}
                    </TableCell>
                    <TableCell className="text-sm">{Number(b.bdi_pct).toFixed(2)}%</TableCell>
                    <TableCell className="text-right text-sm text-zinc-600 dark:text-zinc-400">
                      {formatBRL(b.total_bruto)}
                    </TableCell>
                    <TableCell className="text-right text-sm font-medium">
                      {formatBRL(b.total_com_bdi)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={b.status === "finalizado" ? "default" : "outline"}>
                        {b.status === "finalizado" ? "Finalizado" : "Rascunho"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Link
                        href={`/projetos/${projectId}/orcamento/${b.id}`}
                        className="text-sm text-zinc-700 underline-offset-2 hover:underline dark:text-zinc-300"
                      >
                        Abrir
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
