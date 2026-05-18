import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrg } from "@/server/services/current-org";
import { TiptapEditor } from "@/components/features/documents/TiptapEditor";
import { DocumentPdfExport } from "@/components/features/documents/DocumentPdfExport";
import { DocumentStatusToggle } from "@/components/features/documents/DocumentStatusToggle";
import { SendToPortalButton } from "@/components/features/documents/SendToPortalButton";
import { DeleteButton } from "@/components/features/shell/DeleteButton";
import { deleteDocumentAction } from "@/server/actions/documents/delete.action";
import { DOCUMENT_LABELS, type DocumentTipo } from "@/lib/ai/generate-document";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

type Props = { params: Promise<{ id: string; documentId: string }> };

type DocumentDetail = {
  id: string;
  project_id: string;
  tipo: DocumentTipo | "briefing" | "aditivo";
  versao: number;
  titulo: string;
  conteudo_tiptap: Record<string, unknown>;
  status: "rascunho" | "aguardando_aprovacao" | "aprovado" | "recusado" | "arquivado";
  prompt_versao: string | null;
  custo_tokens: { usd_cost?: number } | null;
  envio_meta: { enviado_em: string } | null;
  aprovacao_meta: { decisao: "aprovado" | "recusado"; timestamp: string } | null;
};

function tipoLabel(tipo: DocumentDetail["tipo"]): string {
  if (tipo in DOCUMENT_LABELS) return DOCUMENT_LABELS[tipo as DocumentTipo];
  if (tipo === "briefing") return "Briefing";
  if (tipo === "aditivo") return "Aditivo";
  return tipo;
}

export default async function DocumentEditorPage({ params }: Props) {
  const { id: projectId, documentId } = await params;
  const supabase = await createClient();

  const [{ data: doc, error }, { data: project }, org] = await Promise.all([
    supabase
      .from("documents")
      .select(
        "id, project_id, tipo, versao, titulo, conteudo_tiptap, status, prompt_versao, custo_tokens, envio_meta, aprovacao_meta",
      )
      .eq("id", documentId)
      .single<DocumentDetail>(),
    supabase.from("projects").select("nome").eq("id", projectId).single(),
    getCurrentOrg(),
  ]);

  if (error || !doc) notFound();
  if (doc.project_id !== projectId) notFound();

  const projectName = project?.nome ?? "Projeto";
  const filenameBase = `${doc.tipo}-${projectName.replace(/\s+/g, "-")}-v${doc.versao}`;

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/projetos/${projectId}/documentos`}
          className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-50"
        >
          ← Documentos · {projectName}
        </Link>
        <div className="mt-1 flex flex-col items-start gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-zinc-500">
              <span>{tipoLabel(doc.tipo)}</span>
              <span>·</span>
              <span>v{doc.versao}</span>
              {doc.prompt_versao ? (
                <>
                  <span>·</span>
                  <span>{doc.prompt_versao}</span>
                </>
              ) : null}
              {doc.custo_tokens?.usd_cost ? (
                <>
                  <span>·</span>
                  <span>${doc.custo_tokens.usd_cost.toFixed(4)} IA</span>
                </>
              ) : null}
            </div>
            <h1 className="mt-1 text-xl font-semibold tracking-tight break-words sm:text-2xl">
              {doc.titulo}
            </h1>
            <Badge variant={doc.status === "rascunho" ? "outline" : "default"} className="mt-2">
              {doc.status === "rascunho"
                ? "Rascunho — RASCUNHO aparece como marca d'água no PDF"
                : doc.status}
            </Badge>
          </div>

          <div className="flex w-full flex-wrap items-end gap-2 sm:w-auto">
            <DocumentStatusToggle documentId={doc.id} status={doc.status} />
            <SendToPortalButton documentId={doc.id} envioMeta={doc.envio_meta} />
            <DocumentPdfExport
              filename={filenameBase}
              titulo={doc.titulo}
              conteudoTiptap={doc.conteudo_tiptap}
              status={doc.status}
              orgName={org.orgName}
              projectName={projectName}
            />
            <DeleteDocControl id={doc.id} projectId={projectId} />
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Editor</CardTitle>
        </CardHeader>
        <CardContent>
          <TiptapEditor
            key={doc.id}
            documentId={doc.id}
            initialTitulo={doc.titulo}
            initialContent={doc.conteudo_tiptap}
          />
          <p className="mt-3 text-xs text-zinc-500">
            Disclaimer (vai no rodapé do PDF): &quot;Documento gerado com auxílio de inteligência
            artificial. Revise o conteúdo antes de utilizar. A responsabilidade técnica é do
            profissional emissor.&quot;
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function DeleteDocControl({ id, projectId }: { id: string; projectId: string }) {
  const handle = async () => {
    "use server";
    return await deleteDocumentAction(id);
  };
  return (
    <DeleteButton
      label="Excluir versão"
      confirmTitle="Excluir documento?"
      confirmDescription="Esta versão do documento será removida permanentemente. Outras versões do mesmo tipo continuam intactas."
      onConfirm={handle}
      redirectAfterSuccess={`/projetos/${projectId}/documentos`}
      successMessage="Documento excluído"
      variant="outline"
      size="sm"
    />
  );
}
