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
import { GenerateDocumentMenu } from "@/components/features/documents/GenerateDocumentMenu";
import { parseProjectMeta } from "@/lib/validators/project-meta.schema";
import {
  UseTemplateDialog,
  type OrgTemplate,
} from "@/components/features/documents/UseTemplateDialog";
import { DOCUMENT_LABELS, type DocumentTipo } from "@/lib/ai/generate-document";
import { DocumentStatusTabs } from "@/components/features/documents/DocumentStatusTabs";
import { getCurrentOrg } from "@/server/services/current-org";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ status?: string }>;
};

type DocStatus = "rascunho" | "aguardando_aprovacao" | "aprovado" | "recusado" | "arquivado";

type DocumentRow = {
  id: string;
  tipo: DocumentTipo | "briefing" | "aditivo";
  versao: number;
  titulo: string;
  status: DocStatus;
  prompt_versao: string | null;
  created_at: string;
  updated_at: string;
};

const STATUS_LABEL: Record<DocStatus, string> = {
  rascunho: "Rascunho",
  aguardando_aprovacao: "Aguardando aprovação",
  aprovado: "Aprovado",
  recusado: "Recusado",
  arquivado: "Arquivado",
};

const STATUS_VARIANT: Record<DocStatus, "default" | "outline" | "secondary" | "destructive"> = {
  rascunho: "outline",
  aguardando_aprovacao: "secondary",
  aprovado: "default",
  recusado: "destructive",
  arquivado: "outline",
};

const VALID_STATUS_FILTERS = new Set<DocStatus>([
  "rascunho",
  "aguardando_aprovacao",
  "aprovado",
  "recusado",
  "arquivado",
]);

function tipoLabel(tipo: DocumentRow["tipo"]): string {
  if (tipo in DOCUMENT_LABELS) return DOCUMENT_LABELS[tipo as DocumentTipo];
  if (tipo === "briefing") return "Briefing";
  if (tipo === "aditivo") return "Aditivo";
  return tipo;
}

export default async function DocumentosPage({ params, searchParams }: Props) {
  const { id: projectId } = await params;
  const sp = await searchParams;
  const statusFilter =
    sp.status && VALID_STATUS_FILTERS.has(sp.status as DocStatus) ? (sp.status as DocStatus) : null;

  const supabase = await createClient();

  const me = await getCurrentOrg();
  const { data: project, error } = await supabase
    .from("projects")
    .select("id, nome, meta, client_id")
    .eq("id", projectId)
    .single();
  if (error || !project) notFound();

  const [{ data: allDocuments }, { data: templates }] = await Promise.all([
    supabase
      .from("documents")
      .select("id, tipo, versao, titulo, status, prompt_versao, created_at, updated_at")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })
      .returns<DocumentRow[]>(),
    supabase
      .from("org_doc_templates")
      .select("id, tipo, nome, created_at")
      .eq("org_id", me.orgId)
      .order("created_at", { ascending: false })
      .returns<OrgTemplate[]>(),
  ]);

  const documents = allDocuments ?? [];

  // Contadores por status (sempre dos documentos todos, não os filtrados)
  const counts = documents.reduce(
    (acc, d) => {
      acc[d.status] = (acc[d.status] ?? 0) + 1;
      return acc;
    },
    {} as Record<DocStatus, number>,
  );

  const filtered = statusFilter ? documents.filter((d) => d.status === statusFilter) : documents;

  const projectMeta = parseProjectMeta(project.meta);
  const hasConfirmedExtraction = !!projectMeta.extracao_planta?.confirmed_by_user;

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
          <h1 className="text-2xl font-semibold tracking-tight">Documentos</h1>
          <div className="flex items-center gap-2">
            <UseTemplateDialog projectId={projectId} templates={templates ?? []} />
            <GenerateDocumentMenu
              projectId={projectId}
              hasConfirmedExtraction={hasConfirmedExtraction}
              hasClient={!!project.client_id}
            />
          </div>
        </div>
      </div>

      {!hasConfirmedExtraction ? (
        <Card>
          <CardContent className="p-4 text-sm text-zinc-600 dark:text-zinc-400">
            <p>
              <strong>Memorial</strong> e <strong>Caderno</strong> precisam da extração da planta
              confirmada (faça upload do PDF no projeto e clique em Confirmar). Já{" "}
              <strong>Proposta comercial</strong> e <strong>Contrato</strong> podem ser gerados só
              com dados do projeto e do cliente.
            </p>
          </CardContent>
        </Card>
      ) : null}

      {documents.length > 0 ? (
        <DocumentStatusTabs
          counts={{
            all: documents.length,
            rascunho: counts.rascunho ?? 0,
            aguardando_aprovacao: counts.aguardando_aprovacao ?? 0,
            aprovado: counts.aprovado ?? 0,
            recusado: counts.recusado ?? 0,
            arquivado: counts.arquivado ?? 0,
          }}
          current={statusFilter}
        />
      ) : null}

      {documents.length === 0 ? (
        <Card>
          <CardContent className="space-y-2 p-8 text-center">
            <p className="text-base font-medium">Nenhum documento gerado ainda</p>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Use o botão{" "}
              <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs dark:bg-zinc-800">
                Gerar documento por IA
              </span>{" "}
              acima. Os tipos estão agrupados em <strong>Memoriais gerais</strong>,{" "}
              <strong>Comercial</strong> e <strong>Memoriais técnicos</strong>.
            </p>
            {!hasConfirmedExtraction ? (
              <p className="text-xs text-amber-700 dark:text-amber-400">
                Para tipos técnicos (memorial, caderno, estrutural, etc.) é preciso confirmar a
                extração da planta primeiro. Proposta, contrato e cronograma podem ser gerados sem.
              </p>
            ) : null}
          </CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center text-sm text-zinc-600 dark:text-zinc-400">
            Nenhum documento neste status. Use os filtros acima para ver outras categorias.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {statusFilter
                ? `${STATUS_LABEL[statusFilter]} (${filtered.length})`
                : "Todas as versões"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Título</TableHead>
                  <TableHead>v.</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Atualizado</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell className="font-medium">{tipoLabel(d.tipo)}</TableCell>
                    <TableCell className="text-sm text-zinc-700 dark:text-zinc-300">
                      <Link
                        href={`/projetos/${projectId}/documentos/${d.id}`}
                        className="hover:underline"
                      >
                        {d.titulo}
                      </Link>
                    </TableCell>
                    <TableCell className="text-sm">v{d.versao}</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[d.status]}>{STATUS_LABEL[d.status]}</Badge>
                    </TableCell>
                    <TableCell className="text-xs text-zinc-500">
                      {new Date(d.updated_at).toLocaleString("pt-BR")}
                    </TableCell>
                    <TableCell className="text-right">
                      <Link
                        href={`/projetos/${projectId}/documentos/${d.id}`}
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
