import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrg } from "@/server/services/current-org";
import { ProjectForm } from "@/components/features/projects/ProjectForm";
import { FileUploader } from "@/components/features/files/FileUploader";
import { FilesList, type ProjectFileRow } from "@/components/features/files/FilesList";
import { DeleteButton } from "@/components/features/shell/DeleteButton";
import { deleteProjectAction } from "@/server/actions/projects/delete.action";
import { STATUS_LABEL, TIPOLOGIA_LABEL } from "@/lib/validators/projects.schema";
import type {
  PADRAO_VALUES,
  STATUS_VALUES,
  TIPOLOGIA_VALUES,
} from "@/lib/validators/projects.schema";
import {
  ExtractionReview,
  type ExtractionData,
} from "@/components/features/extraction/ExtractionReview";
import { ExtractionPoller } from "@/components/features/extraction/ExtractionPoller";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

type ProjectDetail = {
  id: string;
  nome: string;
  client_id: string | null;
  tipologia: (typeof TIPOLOGIA_VALUES)[number];
  area_prevista_m2: number | null;
  padrao_construtivo: (typeof PADRAO_VALUES)[number] | null;
  endereco_cep: string | null;
  endereco_completo: string | null;
  status: (typeof STATUS_VALUES)[number];
  clients: { id: string; nome: string } | null;
  meta: Record<string, unknown> | null;
};

type ExtractionFileRow = ProjectFileRow & {
  extracao_status: "pendente" | "processando" | "concluida" | "erro" | null;
  extracao_resultado:
    | (ExtractionData & { _meta?: { prompt_version?: string; usage?: { usd_cost?: number } } })
    | null;
  extracao_erro: string | null;
};

export default async function ProjetoDetailPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: project, error }, { data: clients }, { data: files }, org] = await Promise.all([
    supabase
      .from("projects")
      .select(
        "id, nome, client_id, tipologia, area_prevista_m2, padrao_construtivo, endereco_cep, endereco_completo, status, meta, clients ( id, nome )",
      )
      .eq("id", id)
      .single<ProjectDetail>(),
    supabase
      .from("clients")
      .select("id, nome")
      .order("nome", { ascending: true })
      .returns<Array<{ id: string; nome: string }>>(),
    supabase
      .from("project_files")
      .select(
        "id, nome_original, storage_path, mime_type, tamanho_bytes, tipo, created_at, extracao_status, extracao_resultado, extracao_erro",
      )
      .eq("project_id", id)
      .order("created_at", { ascending: false })
      .returns<ExtractionFileRow[]>(),
    getCurrentOrg(),
  ]);

  if (error || !project) {
    notFound();
  }

  // Find the most recent successful extraction for the review UI.
  const completedExtraction = (files ?? []).find(
    (f) => f.extracao_status === "concluida" && f.extracao_resultado,
  );
  const errorExtraction = (files ?? []).find((f) => f.extracao_status === "erro");
  const inFlight = (files ?? []).some(
    (f) => f.extracao_status === "pendente" || f.extracao_status === "processando",
  );

  const confirmedByUser = !!(
    project.meta?.extracao_planta as { confirmed_by_user?: boolean } | undefined
  )?.confirmed_by_user;

  return (
    <div className="space-y-6">
      <ExtractionPoller anyInFlight={inFlight} />

      <div className="flex items-end justify-between gap-4">
        <div>
          <Link
            href="/projetos"
            className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-50"
          >
            ← Projetos
          </Link>
          <div className="mt-1 flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">{project.nome}</h1>
            <Badge variant="outline">{STATUS_LABEL[project.status]}</Badge>
          </div>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            {TIPOLOGIA_LABEL[project.tipologia]}
            {project.clients?.nome ? ` · cliente: ${project.clients.nome}` : ""}
          </p>
        </div>
        <DeleteProjectControl id={project.id} />
      </div>

      {completedExtraction?.extracao_resultado ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Extração da planta (IA)</CardTitle>
          </CardHeader>
          <CardContent>
            <ExtractionReview
              projectId={project.id}
              sourceFileId={completedExtraction.id}
              extraction={completedExtraction.extracao_resultado}
              confirmedByUser={confirmedByUser}
              promptVersion={completedExtraction.extracao_resultado._meta?.prompt_version}
              usdCost={completedExtraction.extracao_resultado._meta?.usage?.usd_cost}
            />
          </CardContent>
        </Card>
      ) : null}

      {errorExtraction && !completedExtraction ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Extração da planta (IA)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-900 dark:border-red-900 dark:bg-red-950 dark:text-red-100">
              <p className="font-medium">Falha ao extrair dados</p>
              <p className="mt-1 text-xs">{errorExtraction.extracao_erro ?? "Erro desconhecido"}</p>
              <p className="mt-2 text-xs">
                Tente fazer upload de outra versão do PDF (mais legível, com cotas) ou edite os
                dados manualmente abaixo.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {inFlight && !completedExtraction ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Extração da planta (IA)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Claude está analisando o PDF da planta. Isso pode levar até 1 minuto — a página
              atualiza sozinha quando terminar.
            </p>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Arquivos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <FileUploader projectId={project.id} orgId={org.orgId} />
          <FilesList files={files ?? []} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dados do projeto</CardTitle>
        </CardHeader>
        <CardContent>
          <ProjectForm
            initial={{
              id: project.id,
              nome: project.nome,
              client_id: project.client_id,
              tipologia: project.tipologia,
              area_prevista_m2: project.area_prevista_m2,
              padrao_construtivo: project.padrao_construtivo,
              endereco_cep: project.endereco_cep ?? undefined,
              endereco_completo: project.endereco_completo ?? undefined,
              status: project.status,
            }}
            clients={clients ?? []}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Próximas seções</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
          <p>📊 Orçamento SINAPI — chega no Sprint 4 (consumirá a extração acima)</p>
          <p>📄 Documentos por IA (memorial, caderno, proposta, contrato) — Sprint 5</p>
          <p>👤 Portal do cliente com aprovação digital — Sprint 6</p>
        </CardContent>
      </Card>
    </div>
  );
}

function DeleteProjectControl({ id }: { id: string }) {
  const handle = async () => {
    "use server";
    return await deleteProjectAction(id);
  };
  return (
    <DeleteButton
      label="Excluir projeto"
      confirmTitle="Excluir projeto?"
      confirmDescription="Arquivos no Storage também serão removidos. Esta ação não pode ser desfeita."
      onConfirm={handle}
      variant="outline"
      size="sm"
    />
  );
}
