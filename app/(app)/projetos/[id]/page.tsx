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
};

export default async function ProjetoDetailPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: project, error }, { data: clients }, { data: files }, org] = await Promise.all([
    supabase
      .from("projects")
      .select(
        "id, nome, client_id, tipologia, area_prevista_m2, padrao_construtivo, endereco_cep, endereco_completo, status, clients ( id, nome )",
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
      .select("id, nome_original, storage_path, mime_type, tamanho_bytes, tipo, created_at")
      .eq("project_id", id)
      .order("created_at", { ascending: false })
      .returns<ProjectFileRow[]>(),
    getCurrentOrg(),
  ]);

  if (error || !project) {
    notFound();
  }

  return (
    <div className="space-y-6">
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
          <p>📊 Orçamento SINAPI — chega no Sprint 4</p>
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
