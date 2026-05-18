import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Portal data loader (sprint 6 — F6 Portal do Cliente).
 *
 * O portal é uma rota pública (sem login) acessada via `/portal/[token]`.
 * Aqui validamos o token e carregamos o estado do projeto via service-role
 * (RLS é uma camada de defesa secundária — ver
 * 20260607000001_portal_and_scope_changes.sql).
 *
 * Nunca exporte campos internos do escritório aqui (org_id, e-mails de
 * profissionais, etc) que o cliente não deva ver.
 */

export type PortalDocument = {
  id: string;
  tipo: "memorial" | "caderno" | "proposta" | "contrato" | "briefing" | "aditivo";
  versao: number;
  titulo: string;
  status: string;
  envio_meta: { enviado_em: string; enviado_por?: string } | null;
  aprovacao_meta: PortalApprovalMeta | null;
  aprovado_em: string | null;
  hash_sha256: string | null;
  updated_at: string;
};

export type PortalApprovalMeta = {
  decisao: "aprovado" | "recusado";
  assinatura_data_url: string;
  ip: string | null;
  user_agent: string | null;
  timestamp: string;
  hash_documento: string;
  observacoes?: string;
};

export type PortalScopeChange = {
  id: string;
  descricao: string;
  urgencia: "baixa" | "media" | "alta" | null;
  status: "pendente_analise" | "aguardando_cliente" | "aprovado" | "recusado" | "cancelado";
  valor_aditivo: number | null;
  prazo_adicional_dias: number | null;
  solicitado_por: "cliente" | "profissional";
  created_at: string;
  resolvido_em: string | null;
  aprovacao_meta: PortalApprovalMeta | null;
};

export type PortalBriefing = {
  id: string;
  status: "aguardando_cliente" | "preenchido" | "arquivado";
  enviado_em: string | null;
  preenchido_em: string | null;
  respostas: Record<string, unknown> | null;
};

export type PortalProject = {
  client: {
    nome: string;
    email: string | null;
  };
  project: {
    id: string;
    nome: string;
    status: string;
    tipologia: string;
    endereco_completo: string | null;
    valor_contrato: number | null;
    created_at: string;
  };
  organization: {
    nome: string;
    logo_url: string | null;
    cor_primaria: string | null;
  };
  documents: PortalDocument[];
  scope_changes: PortalScopeChange[];
  briefing: PortalBriefing | null;
};

export type PortalLoadResult =
  | { ok: true; data: PortalProject }
  | { ok: false; reason: "invalid_token" | "no_project" | "db_error"; detail?: string };

/**
 * Valida o portal_token e devolve o estado completo do projeto do cliente.
 *
 * Multi-projeto por cliente: pegamos o projeto MAIS RECENTE associado a este
 * cliente. Numa V2, o portal vai listar todos os projetos do cliente.
 */
export async function loadPortalByToken(token: string): Promise<PortalLoadResult> {
  // Validate UUID format before hitting DB
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token)) {
    return { ok: false, reason: "invalid_token" };
  }

  const admin = createAdminClient();

  const { data: client, error: clientErr } = await admin
    .from("clients")
    .select("id, org_id, nome, email")
    .eq("portal_token", token)
    .maybeSingle();

  if (clientErr) return { ok: false, reason: "db_error", detail: clientErr.message };
  if (!client) return { ok: false, reason: "invalid_token" };

  const { data: org, error: orgErr } = await admin
    .from("organizations")
    .select("name, logo_url, cor_primaria")
    .eq("id", client.org_id)
    .maybeSingle();

  if (orgErr) return { ok: false, reason: "db_error", detail: orgErr.message };
  if (!org) return { ok: false, reason: "no_project" };

  const { data: project, error: projectErr } = await admin
    .from("projects")
    .select("id, nome, status, tipologia, endereco_completo, valor_contrato, created_at")
    .eq("client_id", client.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (projectErr) return { ok: false, reason: "db_error", detail: projectErr.message };
  if (!project) return { ok: false, reason: "no_project" };

  const { data: documents, error: docsErr } = await admin
    .from("documents")
    .select(
      "id, tipo, versao, titulo, status, envio_meta, aprovacao_meta, aprovado_em, hash_sha256, updated_at",
    )
    .eq("project_id", project.id)
    .not("envio_meta", "is", null)
    .order("updated_at", { ascending: false });

  if (docsErr) return { ok: false, reason: "db_error", detail: docsErr.message };

  const { data: scopeChanges, error: scErr } = await admin
    .from("scope_changes")
    .select(
      "id, descricao, urgencia, status, valor_aditivo, prazo_adicional_dias, solicitado_por, created_at, resolvido_em, aprovacao_meta",
    )
    .eq("project_id", project.id)
    .order("created_at", { ascending: false });

  if (scErr) return { ok: false, reason: "db_error", detail: scErr.message };

  const { data: briefingRow } = await admin
    .from("briefings")
    .select("id, status, enviado_em, preenchido_em, respostas")
    .eq("project_id", project.id)
    .maybeSingle();

  return {
    ok: true,
    data: {
      client: { nome: client.nome, email: client.email },
      project,
      organization: {
        nome: org.name as string,
        logo_url: (org.logo_url ?? null) as string | null,
        cor_primaria: (org.cor_primaria ?? null) as string | null,
      },
      documents: (documents ?? []) as PortalDocument[],
      scope_changes: (scopeChanges ?? []) as PortalScopeChange[],
      briefing: briefingRow as PortalBriefing | null,
    },
  };
}

/**
 * Valida que um project_id pertence ao client com o portal_token informado.
 * Usado pelas portal actions antes de qualquer escrita.
 */
export async function assertPortalAccess(
  token: string,
  projectId: string,
): Promise<{ ok: true; clientId: string; orgId: string } | { ok: false; reason: string }> {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token)) {
    return { ok: false, reason: "invalid_token" };
  }
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("clients")
    .select("id, org_id, projects!inner(id)")
    .eq("portal_token", token)
    .eq("projects.id", projectId)
    .maybeSingle();
  if (error) return { ok: false, reason: error.message };
  if (!data) return { ok: false, reason: "access_denied" };
  return { ok: true, clientId: data.id as string, orgId: data.org_id as string };
}
