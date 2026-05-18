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
import {
  ScopeChangesCard,
  type ScopeChangeForProf,
} from "@/components/features/scope-changes/ScopeChangesCard";
import { BriefingCard } from "@/components/features/briefings/BriefingCard";
import type { BriefingRespostas } from "@/lib/validators/briefing.schema";
import { ArtRrtCard } from "@/components/features/art-rrt/ArtRrtCard";
import type { ArtRrtData } from "@/lib/art-rrt/fields";
import { NbrChecksCard } from "@/components/features/nbr-checks/NbrChecksCard";
import { ZoneamentoCard } from "@/components/features/zoneamento/ZoneamentoCard";

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
  cidade_codigo: string | null;
  zoneamento: string | null;
  area_terreno_m2: number | null;
  clients: { id: string; nome: string; portal_token: string } | null;
  meta: Record<string, unknown> | null;
};

type BriefingRow = {
  id: string;
  status: "aguardando_cliente" | "preenchido" | "arquivado";
  enviado_em: string | null;
  preenchido_em: string | null;
  respostas: BriefingRespostas | null;
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

  const [
    { data: project, error },
    { data: clients },
    { data: files },
    { data: scopeChanges },
    org,
  ] = await Promise.all([
    supabase
      .from("projects")
      .select(
        "id, nome, client_id, tipologia, area_prevista_m2, padrao_construtivo, endereco_cep, endereco_completo, status, cidade_codigo, zoneamento, area_terreno_m2, meta, clients ( id, nome, portal_token )",
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
    supabase
      .from("scope_changes")
      .select(
        "id, descricao, urgencia, solicitado_por, status, valor_aditivo, prazo_adicional_dias, created_at, resolvido_em",
      )
      .eq("project_id", id)
      .order("created_at", { ascending: false })
      .returns<ScopeChangeForProf[]>(),
    getCurrentOrg(),
  ]);

  const { data: briefingRow } = await supabase
    .from("briefings")
    .select("id, status, enviado_em, preenchido_em, respostas")
    .eq("project_id", id)
    .maybeSingle<BriefingRow>();

  // ART/RRT pre-fill: precisa de dados completos do cliente + org.
  const [{ data: orgFull }, { data: clientFull }] = await Promise.all([
    supabase
      .from("organizations")
      .select("name, cnpj, registro_cau, registro_crea")
      .eq("id", org.orgId)
      .single<{
        name: string;
        cnpj: string | null;
        registro_cau: string | null;
        registro_crea: string | null;
      }>(),
    project?.client_id
      ? supabase
          .from("clients")
          .select(
            "nome, cpf_cnpj, endereco_logradouro, endereco_numero, endereco_complemento, endereco_bairro, endereco_cidade, endereco_uf",
          )
          .eq("id", project.client_id)
          .maybeSingle<{
            nome: string | null;
            cpf_cnpj: string | null;
            endereco_logradouro: string | null;
            endereco_numero: string | null;
            endereco_complemento: string | null;
            endereco_bairro: string | null;
            endereco_cidade: string | null;
            endereco_uf: string | null;
          }>()
      : Promise.resolve({ data: null }),
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

      <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
        <div className="min-w-0">
          <Link
            href="/projetos"
            className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-50"
          >
            ← Projetos
          </Link>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold tracking-tight break-words sm:text-2xl">
              {project.nome}
            </h1>
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
        <>
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

          {confirmedByUser ? (
            <NbrChecksCard
              extracao={{
                area_total_m2: completedExtraction.extracao_resultado.area_total_m2 ?? null,
                numero_pavimentos: completedExtraction.extracao_resultado.numero_pavimentos ?? null,
                ambientes:
                  completedExtraction.extracao_resultado.ambientes?.map((a) => ({
                    nome: a.nome,
                    area_m2: a.area_m2 ?? null,
                    tipo: a.tipo,
                  })) ?? [],
              }}
            />
          ) : null}

          <ZoneamentoCard
            cidade_codigo={project.cidade_codigo}
            zona_codigo={project.zoneamento}
            area_terreno_m2={project.area_terreno_m2}
            area_construida_total_m2={
              completedExtraction.extracao_resultado.area_total_m2 ?? project.area_prevista_m2
            }
            numero_pavimentos={completedExtraction.extracao_resultado.numero_pavimentos ?? null}
            tem_garagem={
              completedExtraction.extracao_resultado.elementos_especiais?.garagem ?? false
            }
          />
        </>
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
              cidade_codigo: project.cidade_codigo,
              zoneamento: project.zoneamento,
              area_terreno_m2: project.area_terreno_m2,
            }}
            clients={clients ?? []}
          />
        </CardContent>
      </Card>

      <BriefingCard
        projectId={project.id}
        briefing={briefingRow ?? null}
        portalUrl={project.clients?.portal_token ? `/portal/${project.clients.portal_token}` : null}
      />

      <ArtRrtCard
        filename={`art-rrt-${project.nome.replace(/\s+/g, "-")}`}
        initial={
          {
            tipo: orgFull?.registro_cau && !orgFull?.registro_crea ? "rrt" : "art",
            profissional_nome: "",
            profissional_registro: orgFull?.registro_cau ?? orgFull?.registro_crea ?? "",
            profissional_cpf: "",
            profissional_email: org.email,
            profissional_endereco: "",
            org_nome: orgFull?.name ?? org.orgName,
            org_cnpj: orgFull?.cnpj ?? "",
            contratante_nome: clientFull?.nome ?? project.clients?.nome ?? "",
            contratante_cpf_cnpj: clientFull?.cpf_cnpj ?? "",
            contratante_endereco: [
              clientFull?.endereco_logradouro,
              clientFull?.endereco_numero,
              clientFull?.endereco_complemento,
              clientFull?.endereco_bairro,
              clientFull?.endereco_cidade,
              clientFull?.endereco_uf,
            ]
              .filter(Boolean)
              .join(", "),
            obra_endereco_completo: project.endereco_completo ?? "",
            obra_cidade_uf: "",
            obra_tipologia: TIPOLOGIA_LABEL[project.tipologia],
            obra_area_m2: project.area_prevista_m2 ?? null,
            obra_pavimentos: null,
            obra_padrao: project.padrao_construtivo ?? "",
            atividade_descricao: `${TIPOLOGIA_LABEL[project.tipologia]} — ${project.nome}`,
            atividade_tipo: "projeto",
            data_inicio: new Date().toISOString().slice(0, 10),
            data_previsao_termino: null,
            valor_contrato_brl: null,
          } satisfies ArtRrtData
        }
      />

      <ScopeChangesCard scopeChanges={scopeChanges ?? []} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Próximas seções</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
          <p>
            📊{" "}
            <Link
              href={`/projetos/${project.id}/orcamento`}
              className="font-medium text-zinc-900 underline-offset-2 hover:underline dark:text-zinc-50"
            >
              Orçamento SINAPI
            </Link>{" "}
            — gere a partir da extração acima (Sprint 4 ✅)
          </p>
          <p>
            📄{" "}
            <Link
              href={`/projetos/${project.id}/documentos`}
              className="font-medium text-zinc-900 underline-offset-2 hover:underline dark:text-zinc-50"
            >
              Documentos por IA
            </Link>{" "}
            — memorial, caderno, proposta, contrato (Sprint 5 ✅)
          </p>
          <p>
            👤 Portal do cliente com aprovação digital (Sprint 6 ✅) — Envie um documento ao cliente
            pelo editor e ele aparece em <code>/portal/&lt;token&gt;</code>.
          </p>
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
      redirectAfterSuccess="/projetos"
      successMessage="Projeto excluído"
      variant="outline"
      size="sm"
    />
  );
}
