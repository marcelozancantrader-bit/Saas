import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrg } from "@/server/services/current-org";
import { DOCUMENT_LABELS, type DocumentTipo } from "@/lib/ai/generate-document";
import { Bookmark, FileText } from "lucide-react";
import { TemplateDeleteButton } from "@/components/features/templates/TemplateDeleteButton";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Templates do escritório · Configurações · Memorial.ai",
};

type TemplateRow = {
  id: string;
  tipo: string;
  nome: string;
  created_at: string;
  source_document_id: string | null;
};

function tipoLabel(tipo: string): string {
  if (tipo in DOCUMENT_LABELS) return DOCUMENT_LABELS[tipo as DocumentTipo];
  return tipo;
}

const TIPO_TONE: Record<string, string> = {
  memorial:
    "border-blue-300 bg-blue-50 text-blue-900 dark:border-blue-900/40 dark:bg-blue-950/40 dark:text-blue-200",
  caderno:
    "border-violet-300 bg-violet-50 text-violet-900 dark:border-violet-900/40 dark:bg-violet-950/40 dark:text-violet-200",
  proposta:
    "border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-900/40 dark:bg-emerald-950/40 dark:text-emerald-200",
  contrato:
    "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/40 dark:text-amber-200",
};

export default async function TemplatesPage() {
  const me = await getCurrentOrg();
  const supabase = await createClient();
  const { data: templates } = await supabase
    .from("org_doc_templates")
    .select("id, tipo, nome, created_at, source_document_id")
    .eq("org_id", me.orgId)
    .order("created_at", { ascending: false })
    .returns<TemplateRow[]>();

  const rows = templates ?? [];

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/configuracoes"
          className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-50"
        >
          ← Configurações
        </Link>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Templates do escritório</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Modelos de documento salvos pra reusar em projetos futuros. Variáveis como{" "}
          <code className="text-xs">{"{{cliente.nome}}"}</code> são substituídas automaticamente na
          hora de aplicar o template.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {rows.length} {rows.length === 1 ? "template salvo" : "templates salvos"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-zinc-300 bg-zinc-50/50 p-10 text-center dark:border-zinc-700 dark:bg-zinc-900/30">
              <Bookmark className="h-8 w-8 text-zinc-400" />
              <div>
                <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Nenhum template salvo ainda
                </p>
                <p className="mt-1 text-xs text-zinc-500">
                  Vá em qualquer documento do projeto, edite até ficar como você quer e clique em{" "}
                  <strong>&quot;Salvar como template&quot;</strong> no topo da página.
                </p>
              </div>
            </div>
          ) : (
            <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {rows.map((t) => (
                <li
                  key={t.id}
                  className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 shrink-0 text-zinc-400" />
                      <p className="truncate text-sm font-semibold">{t.nome}</p>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                      <Badge variant="outline" className={TIPO_TONE[t.tipo] ?? ""}>
                        {tipoLabel(t.tipo)}
                      </Badge>
                      <span>·</span>
                      <span>salvo em {new Date(t.created_at).toLocaleDateString("pt-BR")}</span>
                      {t.source_document_id ? (
                        <>
                          <span>·</span>
                          <span className="italic">a partir de doc anterior</span>
                        </>
                      ) : null}
                    </div>
                  </div>
                  <TemplateDeleteButton templateId={t.id} templateName={t.nome} />
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Variáveis suportadas nos templates</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p className="text-zinc-600 dark:text-zinc-400">
            Use estas variáveis dentro do texto do template — são substituídas pelos dados do
            projeto/cliente/escritório quando você aplica:
          </p>
          <ul className="space-y-1 text-xs">
            <Var name="{{projeto.nome}}" descricao="Nome do projeto atual" />
            <Var name="{{cliente.nome}}" descricao="Nome do cliente vinculado ao projeto" />
            <Var name="{{cliente.cpf_cnpj}}" descricao="CPF ou CNPJ do cliente" />
            <Var name="{{org.nome}}" descricao="Nome do escritório (este workspace)" />
            <Var name="{{org.profissional}}" descricao="Profissional responsável (ART/RRT)" />
            <Var name="{{data.hoje}}" descricao="Data atual no formato 23 de maio de 2026" />
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

function Var({ name, descricao }: { name: string; descricao: string }) {
  return (
    <li className="flex flex-wrap items-baseline gap-2">
      <code className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-[11px] dark:bg-zinc-800">
        {name}
      </code>
      <span className="text-zinc-600 dark:text-zinc-400">— {descricao}</span>
    </li>
  );
}
