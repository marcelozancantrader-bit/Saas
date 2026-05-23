import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { loadPortalByToken, type PortalDocument } from "@/server/services/portal-loader";
import { DOCUMENT_LABELS, type DocumentTipo } from "@/lib/ai/generate-document";
import { ApprovalCard } from "@/components/features/portal/ApprovalCard";
import { ScopeChangeSection } from "@/components/features/portal/ScopeChangeSection";
import { BriefingForm } from "@/components/features/portal/BriefingForm";
import { ChatDaPlanta } from "@/components/features/portal/ChatDaPlanta";
import { PortalDiarySection } from "@/components/features/portal/PortalDiarySection";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ token: string }> };

const PROJECT_STATUS_LABEL: Record<string, string> = {
  rascunho: "Em planejamento",
  em_andamento: "Em andamento",
  aguardando_cliente: "Aguardando você",
  concluido: "Concluído",
  arquivado: "Arquivado",
};

function tipoLabel(tipo: PortalDocument["tipo"]): string {
  if (tipo in DOCUMENT_LABELS) return DOCUMENT_LABELS[tipo as DocumentTipo];
  if (tipo === "briefing") return "Briefing";
  if (tipo === "aditivo") return "Aditivo contratual";
  return tipo;
}

function formatBrl(value: number | null): string | null {
  if (value === null) return null;
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

export default async function PortalPage({ params }: Props) {
  const { token } = await params;
  const result = await loadPortalByToken(token);
  if (!result.ok) {
    if (result.reason === "invalid_token" || result.reason === "no_project") notFound();
    throw new Error(`Portal load failed: ${result.reason}`);
  }
  const { client, project, organization, documents, scope_changes, briefing, diary_entries } =
    result.data;

  const pending = documents.filter((d) => !d.aprovacao_meta);
  const decided = documents.filter((d) => d.aprovacao_meta);
  const contratoValor = formatBrl(project.valor_contrato);
  const showBriefingForm = briefing?.status === "aguardando_cliente";
  const hasLogo = !!organization.logo_url;

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:py-14">
      <header className="mb-8 flex items-start gap-4">
        {hasLogo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={organization.logo_url!}
            alt={organization.nome}
            className="h-14 w-14 shrink-0 rounded-md border border-zinc-200 bg-white object-contain p-1 dark:border-zinc-700"
          />
        ) : null}
        <div className="min-w-0 space-y-1">
          <p className="text-xs tracking-wider text-zinc-500 uppercase">{organization.nome}</p>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{project.nome}</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Olá, <strong>{client.nome}</strong>. Este é o portal do seu projeto. Aqui você acompanha
            o andamento, aprova documentos e solicita ajustes de escopo.
          </p>
        </div>
      </header>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Resumo</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
          <div>
            <p className="text-xs tracking-wider text-zinc-500 uppercase">Status</p>
            <p className="mt-1 font-medium">
              {PROJECT_STATUS_LABEL[project.status] ?? project.status}
            </p>
          </div>
          <div>
            <p className="text-xs tracking-wider text-zinc-500 uppercase">Tipologia</p>
            <p className="mt-1 font-medium capitalize">{project.tipologia}</p>
          </div>
          {contratoValor ? (
            <div>
              <p className="text-xs tracking-wider text-zinc-500 uppercase">Valor do contrato</p>
              <p className="mt-1 font-medium">{contratoValor}</p>
            </div>
          ) : null}
          {project.endereco_completo ? (
            <div className="sm:col-span-3">
              <p className="text-xs tracking-wider text-zinc-500 uppercase">Endereço</p>
              <p className="mt-1">{project.endereco_completo}</p>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {showBriefingForm ? (
        <section className="mt-8">
          <BriefingForm portalToken={token} projectId={project.id} />
        </section>
      ) : briefing?.status === "preenchido" ? (
        <Card className="mt-8 border-emerald-200 bg-emerald-50/50 dark:border-emerald-900/50 dark:bg-emerald-950/20">
          <CardContent className="p-4 text-sm">
            <p className="font-medium text-emerald-900 dark:text-emerald-100">
              ✅ Briefing enviado{" "}
              {briefing.preenchido_em
                ? `em ${new Date(briefing.preenchido_em).toLocaleString("pt-BR")}`
                : ""}
            </p>
            <p className="mt-1 text-emerald-800 dark:text-emerald-200">
              {organization.nome} está revisando suas respostas. Volte aqui quando tiver novidades —
              vamos avisar por e-mail também.
            </p>
          </CardContent>
        </Card>
      ) : null}

      <section className="mt-8 space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Documentos aguardando sua aprovação</h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Leia cada documento. Para aprovar, desenhe sua assinatura no campo abaixo. Sua aprovação
            é registrada com data, hora e identificador único para validade legal.
          </p>
        </div>

        {pending.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-sm text-zinc-500">
              Nada aguardando aprovação no momento.
            </CardContent>
          </Card>
        ) : (
          pending.map((doc) => (
            <ApprovalCard
              key={doc.id}
              portalToken={token}
              projectId={project.id}
              document={doc}
              tipoLabel={tipoLabel(doc.tipo)}
            />
          ))
        )}
      </section>

      {decided.length > 0 ? (
        <section className="mt-10 space-y-3">
          <h2 className="text-lg font-semibold">Histórico de documentos</h2>
          {decided.map((doc) => {
            const meta = doc.aprovacao_meta!;
            return (
              <Card key={doc.id}>
                <CardContent className="flex items-start justify-between gap-3 p-4 text-sm">
                  <div>
                    <p className="font-medium">{doc.titulo}</p>
                    <p className="text-xs text-zinc-500">
                      {tipoLabel(doc.tipo)} · v{doc.versao}
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge variant={meta.decisao === "aprovado" ? "default" : "destructive"}>
                      {meta.decisao === "aprovado" ? "Aprovado" : "Recusado"}
                    </Badge>
                    <p className="mt-1 text-xs text-zinc-500">
                      {new Date(meta.timestamp).toLocaleString("pt-BR")}
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </section>
      ) : null}

      {diary_entries.length > 0 ? (
        <>
          <Separator className="my-10" />
          <PortalDiarySection entries={diary_entries} />
        </>
      ) : null}

      <Separator className="my-10" />

      <section className="space-y-3">
        <ChatDaPlanta portalToken={token} projectId={project.id} />
      </section>

      <Separator className="my-10" />

      <ScopeChangeSection portalToken={token} projectId={project.id} scopeChanges={scope_changes} />

      <footer className="mt-12 space-y-2 border-t border-zinc-200 pt-6 text-center text-xs text-zinc-500 dark:border-zinc-800">
        <p>
          Dúvidas sobre o projeto? Fale diretamente com{" "}
          <strong className="text-zinc-700 dark:text-zinc-300">{organization.nome}</strong>.
        </p>
        <p className="text-zinc-400">
          Portal seguro · Link pessoal e único — não compartilhe · Memorial.ai
        </p>
      </footer>
    </main>
  );
}
