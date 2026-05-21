import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrg } from "@/server/services/current-org";
import { ClientForm } from "@/components/features/clients/ClientForm";
import { DeleteButton } from "@/components/features/shell/DeleteButton";
import { deleteClientAction } from "@/server/actions/clients/delete.action";
import { PortalLinkCard } from "@/components/features/clients/PortalLinkCard";
import { STATUS_LABEL, TIPOLOGIA_LABEL } from "@/lib/validators/projects.schema";
import type { STATUS_VALUES, TIPOLOGIA_VALUES } from "@/lib/validators/projects.schema";
import { env } from "@/lib/validators/env";
import { getPlanInfo, type PlanId } from "@/lib/plans/limits";
import { maskCpfOrCnpj, maskPhone } from "@/lib/utils/brazilian-formatters";
import { formatBRL } from "@/lib/utils/money";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

type ClientRow = {
  id: string;
  nome: string;
  cpf_cnpj: string | null;
  email: string | null;
  telefone: string | null;
  endereco_cep: string | null;
  endereco_logradouro: string | null;
  endereco_numero: string | null;
  endereco_complemento: string | null;
  endereco_bairro: string | null;
  endereco_cidade: string | null;
  endereco_uf: string | null;
  portal_token: string;
};

type ProjectRow = {
  id: string;
  nome: string;
  tipologia: (typeof TIPOLOGIA_VALUES)[number];
  status: (typeof STATUS_VALUES)[number];
  valor_contrato: number | null;
  area_prevista_m2: number | null;
  created_at: string;
};

type DocumentRow = {
  id: string;
  tipo: string;
  titulo: string;
  status: "rascunho" | "aguardando_aprovacao" | "aprovado" | "recusado" | "arquivado";
  enviado_em: string | null;
  aprovado_em: string | null;
  versao: number;
  project_id: string;
  projects: { nome: string } | null;
};

type ScopeChangeRow = {
  id: string;
  descricao: string;
  urgencia: "baixa" | "media" | "alta" | null;
  status: "pendente_analise" | "aguardando_cliente" | "aprovado" | "recusado" | "cancelado";
  valor_aditivo: number | null;
  created_at: string;
  project_id: string;
  projects: { nome: string } | null;
};

const STATUS_VARIANT: Record<
  ProjectRow["status"],
  "default" | "outline" | "secondary" | "destructive"
> = {
  rascunho: "outline",
  em_andamento: "default",
  aguardando_cliente: "secondary",
  concluido: "secondary",
  arquivado: "outline",
};

const DOC_STATUS_LABEL: Record<DocumentRow["status"], string> = {
  rascunho: "Rascunho",
  aguardando_aprovacao: "Aguardando aprovação",
  aprovado: "Aprovado",
  recusado: "Recusado",
  arquivado: "Arquivado",
};

const DOC_STATUS_VARIANT: Record<
  DocumentRow["status"],
  "default" | "outline" | "secondary" | "destructive"
> = {
  rascunho: "outline",
  aguardando_aprovacao: "secondary",
  aprovado: "default",
  recusado: "destructive",
  arquivado: "outline",
};

const SCOPE_STATUS_LABEL: Record<ScopeChangeRow["status"], string> = {
  pendente_analise: "Aguardando você",
  aguardando_cliente: "Com o cliente",
  aprovado: "Aprovado",
  recusado: "Recusado",
  cancelado: "Cancelado",
};

const SCOPE_STATUS_VARIANT: Record<
  ScopeChangeRow["status"],
  "default" | "outline" | "secondary" | "destructive"
> = {
  pendente_analise: "secondary",
  aguardando_cliente: "secondary",
  aprovado: "default",
  recusado: "destructive",
  cancelado: "outline",
};

export default async function ClienteDetailPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();
  const me = await getCurrentOrg();

  const [{ data: client, error }, { data: orgRow }] = await Promise.all([
    supabase
      .from("clients")
      .select(
        "id, nome, cpf_cnpj, email, telefone, endereco_cep, endereco_logradouro, endereco_numero, endereco_complemento, endereco_bairro, endereco_cidade, endereco_uf, portal_token",
      )
      .eq("id", id)
      .single<ClientRow>(),
    supabase.from("organizations").select("plano").eq("id", me.orgId).single<{ plano: PlanId }>(),
  ]);

  if (error || !client) notFound();

  const planInfo = getPlanInfo(orgRow?.plano ?? "free");
  const portalDisabled = !planInfo.limits.portalClienteEnabled;
  const portalUrl = `${env.NEXT_PUBLIC_APP_URL}/portal/${client.portal_token}`;

  const [{ data: projects }, { data: documents }, { data: scopeChanges }] = await Promise.all([
    supabase
      .from("projects")
      .select("id, nome, tipologia, status, valor_contrato, area_prevista_m2, created_at")
      .eq("client_id", id)
      .order("created_at", { ascending: false })
      .returns<ProjectRow[]>(),
    supabase
      .from("documents")
      .select(
        "id, tipo, titulo, status, enviado_em, aprovado_em, versao, project_id, projects!inner(client_id, nome)",
      )
      .eq("projects.client_id", id)
      .not("enviado_em", "is", null)
      .order("enviado_em", { ascending: false })
      .limit(20)
      .returns<DocumentRow[]>(),
    supabase
      .from("scope_changes")
      .select(
        "id, descricao, urgencia, status, valor_aditivo, created_at, project_id, projects!inner(client_id, nome)",
      )
      .eq("projects.client_id", id)
      .order("created_at", { ascending: false })
      .limit(10)
      .returns<ScopeChangeRow[]>(),
  ]);

  const totalContratos = (projects ?? []).reduce(
    (acc, p) => acc + (Number(p.valor_contrato) || 0),
    0,
  );
  const projectsCount = projects?.length ?? 0;
  const docsAprovados = (documents ?? []).filter((d) => d.status === "aprovado").length;
  const docsAguardando = (documents ?? []).filter(
    (d) => d.status === "aguardando_aprovacao",
  ).length;
  const escoposPendentes = (scopeChanges ?? []).filter(
    (s) => s.status === "pendente_analise" || s.status === "aguardando_cliente",
  ).length;

  return (
    <div className="space-y-6">
      {/* ====== HEADER ====== */}
      <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
        <div className="min-w-0">
          <Link
            href="/clientes"
            className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-50"
          >
            ← Clientes
          </Link>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight break-words">{client.nome}</h1>
          <p className="mt-1 text-base text-zinc-600 dark:text-zinc-400">
            {client.cpf_cnpj ? maskCpfOrCnpj(client.cpf_cnpj) : "Sem CPF/CNPJ"}
            {client.email ? ` · ${client.email}` : ""}
            {client.telefone ? ` · ${maskPhone(client.telefone)}` : ""}
          </p>
        </div>
        <DeleteClientControl id={client.id} />
      </div>

      {/* ====== KPIs RÁPIDOS ====== */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Stat label="Projetos" value={projectsCount.toString()} />
        <Stat label="Faturamento" value={formatBRL(totalContratos)} hint="soma dos contratos" />
        <Stat label="Docs aprovados" value={docsAprovados.toString()} />
        <Stat
          label="Docs aguardando"
          value={docsAguardando.toString()}
          hint="enviados mas não respondidos"
        />
        <Stat
          label="Alterações de escopo"
          value={escoposPendentes.toString()}
          hint="abertas no portal"
        />
      </div>

      {/* ====== PORTAL DO CLIENTE ====== */}
      <PortalLinkCard portalUrl={portalUrl} portalDisabled={portalDisabled} />

      {/* ====== PROJETOS ====== */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-base">Projetos ({projectsCount})</CardTitle>
            <Link
              href={`/projetos/novo?client_id=${client.id}`}
              className="text-sm font-medium text-blue-600 underline-offset-2 hover:underline dark:text-blue-400"
            >
              + Novo projeto
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {projectsCount === 0 ? (
            <p className="py-4 text-center text-sm text-zinc-500">
              Nenhum projeto pra este cliente ainda.
            </p>
          ) : (
            <div className="space-y-2">
              {(projects ?? []).map((p) => (
                <Link
                  key={p.id}
                  href={`/projetos/${p.id}`}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-zinc-200 p-3 transition-colors hover:border-zinc-400 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:border-zinc-600 dark:hover:bg-zinc-900"
                >
                  <div className="min-w-0">
                    <p className="font-medium">{p.nome}</p>
                    <p className="text-sm text-zinc-500">
                      {TIPOLOGIA_LABEL[p.tipologia]}
                      {p.area_prevista_m2 ? ` · ${p.area_prevista_m2.toFixed(0)} m²` : ""}
                      {p.valor_contrato ? ` · ${formatBRL(Number(p.valor_contrato))}` : ""}
                    </p>
                  </div>
                  <Badge variant={STATUS_VARIANT[p.status]}>{STATUS_LABEL[p.status]}</Badge>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ====== DOCUMENTOS NO PORTAL ====== */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Documentos enviados ao portal ({documents?.length ?? 0})
          </CardTitle>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Memoriais, propostas, contratos e aditivos que o cliente recebeu.
          </p>
        </CardHeader>
        <CardContent>
          {(documents?.length ?? 0) === 0 ? (
            <p className="py-4 text-center text-sm text-zinc-500">
              Nenhum documento enviado ainda. Use o botão &quot;Enviar ao portal&quot; em qualquer
              documento gerado.
            </p>
          ) : (
            <div className="space-y-2">
              {(documents ?? []).map((d) => (
                <Link
                  key={d.id}
                  href={`/projetos/${d.project_id}/documentos/${d.id}`}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-zinc-200 p-3 transition-colors hover:border-zinc-400 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:border-zinc-600 dark:hover:bg-zinc-900"
                >
                  <div className="min-w-0">
                    <p className="font-medium">{d.titulo}</p>
                    <p className="text-sm text-zinc-500">
                      {d.projects?.nome ?? "Projeto"} · v{d.versao}
                      {d.enviado_em
                        ? ` · enviado ${new Date(d.enviado_em).toLocaleDateString("pt-BR")}`
                        : ""}
                    </p>
                  </div>
                  <Badge variant={DOC_STATUS_VARIANT[d.status]}>{DOC_STATUS_LABEL[d.status]}</Badge>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ====== ALTERAÇÕES DE ESCOPO ====== */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Alterações de escopo ({scopeChanges?.length ?? 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {(scopeChanges?.length ?? 0) === 0 ? (
            <p className="py-4 text-center text-sm text-zinc-500">
              O cliente ainda não solicitou alterações.
            </p>
          ) : (
            <div className="space-y-2">
              {(scopeChanges ?? []).map((s) => (
                <Link
                  key={s.id}
                  href={`/projetos/${s.project_id}?tab=escopo`}
                  className="flex flex-wrap items-start justify-between gap-2 rounded-lg border border-zinc-200 p-3 transition-colors hover:border-zinc-400 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:border-zinc-600 dark:hover:bg-zinc-900"
                >
                  <div className="min-w-0">
                    <p className="line-clamp-2 font-medium">{s.descricao}</p>
                    <p className="text-sm text-zinc-500">
                      {s.projects?.nome ?? "Projeto"}
                      {s.valor_aditivo ? ` · aditivo ${formatBRL(Number(s.valor_aditivo))}` : ""}
                      {s.urgencia ? ` · urgência ${s.urgencia}` : ""}
                    </p>
                  </div>
                  <Badge variant={SCOPE_STATUS_VARIANT[s.status]}>
                    {SCOPE_STATUS_LABEL[s.status]}
                  </Badge>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ====== DADOS DO CLIENTE (form editável) ====== */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dados do cliente</CardTitle>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Esses dados aparecem em contratos, ART/RRT e no portal.
          </p>
        </CardHeader>
        <CardContent>
          <ClientForm
            initial={{
              id: client.id,
              nome: client.nome,
              cpf_cnpj: client.cpf_cnpj ?? undefined,
              email: client.email ?? undefined,
              telefone: client.telefone ?? undefined,
              endereco_cep: client.endereco_cep ?? undefined,
              endereco_logradouro: client.endereco_logradouro ?? undefined,
              endereco_numero: client.endereco_numero ?? undefined,
              endereco_complemento: client.endereco_complemento ?? undefined,
              endereco_bairro: client.endereco_bairro ?? undefined,
              endereco_cidade: client.endereco_cidade ?? undefined,
              endereco_uf: client.endereco_uf ?? undefined,
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <p className="text-xs tracking-wider text-zinc-500 uppercase">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
      {hint ? <p className="mt-0.5 text-xs text-zinc-500">{hint}</p> : null}
    </div>
  );
}

function DeleteClientControl({ id }: { id: string }) {
  const handle = async () => {
    "use server";
    return await deleteClientAction(id);
  };
  return (
    <DeleteButton
      label="Excluir cliente"
      confirmTitle="Excluir cliente?"
      confirmDescription="Os projetos vinculados manterão o histórico, mas o cliente será removido permanentemente."
      onConfirm={handle}
      redirectAfterSuccess="/clientes"
      successMessage="Cliente excluído"
      variant="outline"
      size="sm"
    />
  );
}
