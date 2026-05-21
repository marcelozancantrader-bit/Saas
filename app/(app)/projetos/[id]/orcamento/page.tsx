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
import { CubPreviewCard } from "@/components/features/budgets/CubPreviewCard";
import { BaseDadosBadge } from "@/components/features/budgets/BaseDadosBadge";
import { loadSinapiCatalog, resolveProjectUf } from "@/lib/budget/sinapi-options";
import { getLatestCubMesForUf } from "@/lib/budget/cub";
import type { Disciplina } from "@/lib/ai/prompts/_shared-extraction-schema";
import type { CubPadrao } from "@/lib/budget/cub";

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
    .select(
      "id, nome, meta, endereco_completo, padrao_construtivo, cidade_codigo, clients ( endereco_uf )",
    )
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
    | {
        confirmed_by_user?: boolean;
        area_total_m2?: number | null;
        padrao_construtivo?: CubPadrao | null;
      }
    | undefined;
  const canGenerate = !!extracao?.confirmed_by_user && !!extracao.area_total_m2;

  // UF da obra — hierarquia: cidade_codigo curado > endereco_completo (regex) > cliente > SP
  const projectAny = project as unknown as {
    endereco_completo?: string | null;
    padrao_construtivo?: CubPadrao | null;
    cidade_codigo?: string | null;
    clients?: { endereco_uf?: string | null } | null;
  };
  const obraUf = resolveProjectUf({
    cidade_codigo: projectAny.cidade_codigo,
    endereco_completo: projectAny.endereco_completo,
    client_uf: projectAny.clients?.endereco_uf,
  });
  const cubPadrao: CubPadrao | null =
    extracao?.padrao_construtivo ?? projectAny.padrao_construtivo ?? null;

  // SINAPI catalog — UFs e meses disponíveis no banco pro dropdown do Regerar
  // e pra detectar mês mais recente da UF da obra (geração inicial).
  const [sinapiCatalog, latestCubMes] = await Promise.all([
    loadSinapiCatalog(),
    getLatestCubMesForUf(obraUf),
  ]);
  const ufHasData = sinapiCatalog.ufs.includes(obraUf);
  const latestMes =
    sinapiCatalog.latestMesPorUf[obraUf] ?? sinapiCatalog.latestMesPorUf.SP ?? "2026-05-01";
  const latestSinapiMes = sinapiCatalog.latestMesPorUf[obraUf] ?? null;

  // Diferencia "sem extração" de "extração pendente confirmação" para mensagens específicas.
  const extractionState: "missing" | "needs_confirm" | "needs_area" | "ready" = !extracao
    ? "missing"
    : !extracao.confirmed_by_user
      ? "needs_confirm"
      : !extracao.area_total_m2 || extracao.area_total_m2 <= 0
        ? "needs_area"
        : "ready";

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
          <GenerateBudgetButton
            projectId={projectId}
            canGenerate={canGenerate}
            uf={obraUf}
            mesReferencia={latestMes}
            ufHasData={ufHasData}
          />
        </div>
        <div className="mt-2">
          <BaseDadosBadge sinapiMes={latestSinapiMes} cubMes={latestCubMes} uf={obraUf} />
        </div>
        {canGenerate ? (
          <p className="mt-2 text-xs text-zinc-500">
            Será gerado pra {obraUf} · BDI 28% · desonerado.{" "}
            <span className="text-zinc-400">
              Pra mudar parâmetros, use &quot;Regerar&quot; após criar.
            </span>
          </p>
        ) : null}
      </div>

      {extractionState === "missing" ? (
        <Card className="border-blue-200 bg-blue-50/50 dark:border-blue-900/50 dark:bg-blue-950/20">
          <CardContent className="flex items-start gap-3 p-4 text-sm">
            <span className="mt-0.5 text-2xl" aria-hidden>
              📐
            </span>
            <div className="flex-1">
              <p className="font-medium text-zinc-900 dark:text-zinc-50">
                Passo 1 de 3 — Subir a planta arquitetônica
              </p>
              <p className="mt-1 text-zinc-600 dark:text-zinc-400">
                O orçamento usa os dados da extração (área, ambientes, padrão) pra calcular
                quantitativos SINAPI.
              </p>
              <Link
                href={`/projetos/${projectId}?tab=planta`}
                className="mt-3 inline-flex items-center text-sm font-medium text-blue-700 underline-offset-2 hover:underline dark:text-blue-400"
              >
                Ir para Planta &amp; IA →
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : extractionState === "needs_confirm" ? (
        <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-900/50 dark:bg-amber-950/20">
          <CardContent className="flex items-start gap-3 p-4 text-sm">
            <span className="mt-0.5 text-2xl" aria-hidden>
              ⏳
            </span>
            <div className="flex-1">
              <p className="font-medium text-zinc-900 dark:text-zinc-50">
                Passo 2 de 3 — Confirmar a extração da planta
              </p>
              <p className="mt-1 text-zinc-600 dark:text-zinc-400">
                A IA já leu sua planta. Volte e clique em{" "}
                <b>&quot;Confirmar e atualizar projeto&quot;</b> no card{" "}
                <b>&quot;Extração da planta (IA)&quot;</b>.
              </p>
              <Link
                href={`/projetos/${projectId}?tab=planta`}
                className="mt-3 inline-flex items-center text-sm font-medium text-amber-700 underline-offset-2 hover:underline dark:text-amber-400"
              >
                Confirmar a extração →
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : extractionState === "needs_area" ? (
        <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-900/50 dark:bg-amber-950/20">
          <CardContent className="flex items-start gap-3 p-4 text-sm">
            <span className="mt-0.5 text-2xl" aria-hidden>
              📏
            </span>
            <div className="flex-1">
              <p className="font-medium text-zinc-900 dark:text-zinc-50">
                Falta a área total no card de extração
              </p>
              <p className="mt-1 text-zinc-600 dark:text-zinc-400">
                Edite o campo &quot;Área total (m²)&quot; e re-confirme — o orçamento precisa do
                valor pra estimar quantitativos.
              </p>
              <Link
                href={`/projetos/${projectId}?tab=planta`}
                className="mt-3 inline-flex items-center text-sm font-medium text-amber-700 underline-offset-2 hover:underline dark:text-amber-400"
              >
                Editar extração →
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <CubPreviewCard uf={obraUf} padrao={cubPadrao} areaM2={extracao?.area_total_m2 ?? null} />

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
