-- =============================================
-- Memorial.ai — Initial schema (Sprint 1)
-- 11 tables per PROMPT_CLAUDE_CODE.md § "Modelo de Dados Completo"
-- =============================================

create extension if not exists pgcrypto;

-- ============= TENANCY =============
create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  cnpj text,
  registro_cau text,
  registro_crea text,
  plano text not null default 'free' check (plano in ('free','pro','studio','agency')),
  logo_url text,
  cor_primaria text default '#1a1a1a',
  bdi_padrao numeric(5,2) default 25.00,
  dados_pix jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.organization_members (
  org_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner','admin','member')),
  invited_at timestamptz,
  accepted_at timestamptz,
  primary key (org_id, user_id)
);

-- ============= CLIENTES =============
create table public.clients (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  nome text not null,
  cpf_cnpj text,
  email text,
  telefone text,
  endereco_cep text,
  endereco_logradouro text,
  endereco_numero text,
  endereco_complemento text,
  endereco_bairro text,
  endereco_cidade text,
  endereco_uf char(2),
  portal_token uuid not null unique default gen_random_uuid(),
  created_at timestamptz not null default now()
);
create index idx_clients_org on public.clients(org_id);
create index idx_clients_portal_token on public.clients(portal_token);

-- ============= PROJETOS =============
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  nome text not null,
  endereco_cep text,
  endereco_completo text,
  tipologia text not null check (tipologia in ('residencial','comercial','reforma','outros')),
  area_prevista_m2 numeric(10,2),
  padrao_construtivo text check (padrao_construtivo in ('popular','medio','alto','luxo')),
  status text not null default 'rascunho'
    check (status in ('rascunho','em_andamento','aguardando_cliente','concluido','arquivado')),
  meta jsonb default '{}'::jsonb,
  valor_contrato numeric(15,2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_projects_org on public.projects(org_id);
create index idx_projects_status on public.projects(status);

-- ============= ARQUIVOS =============
create table public.project_files (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  tipo text not null check (tipo in ('planta_pdf','dwg','imagem','doc_gerado','outro')),
  nome_original text not null,
  storage_path text not null,
  mime_type text,
  tamanho_bytes bigint,
  hash_sha256 text,
  extracao_status text default null
    check (extracao_status in ('pendente','processando','concluida','erro')),
  extracao_resultado jsonb,
  extracao_erro text,
  created_at timestamptz not null default now()
);
create index idx_project_files_project on public.project_files(project_id);

-- ============= ORÇAMENTOS =============
create table public.budgets (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  versao int not null default 1,
  uf char(2) not null,
  mes_referencia date not null,
  desonerado boolean not null default true,
  bdi_pct numeric(5,2) not null default 25.00,
  total_bruto numeric(15,2) not null default 0,
  total_com_bdi numeric(15,2) not null default 0,
  observacoes text,
  status text not null default 'rascunho' check (status in ('rascunho','finalizado')),
  created_at timestamptz not null default now(),
  unique(project_id, versao)
);

create table public.budget_items (
  id uuid primary key default gen_random_uuid(),
  budget_id uuid not null references public.budgets(id) on delete cascade,
  ordem int not null,
  composicao_codigo text,
  descricao text not null,
  unidade text not null,
  quantidade numeric(15,4) not null,
  preco_unitario numeric(15,4) not null,
  total numeric(15,2) generated always as (quantidade * preco_unitario) stored,
  origem text not null default 'sinapi' check (origem in ('sinapi','custom','composicao_propria'))
);
create index idx_budget_items_budget on public.budget_items(budget_id);

-- ============= SINAPI CACHE =============
create table public.sinapi_compositions (
  codigo text not null,
  descricao text not null,
  unidade text not null,
  uf char(2) not null,
  mes_referencia date not null,
  desonerado boolean not null,
  preco numeric(15,4) not null,
  primary key (codigo, uf, mes_referencia, desonerado)
);
create index idx_sinapi_search on public.sinapi_compositions
  using gin (to_tsvector('portuguese', descricao));

-- ============= DOCUMENTOS GERADOS POR IA =============
create table public.documents (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  tipo text not null check (tipo in ('briefing','memorial','caderno','proposta','contrato','aditivo')),
  versao int not null default 1,
  titulo text not null,
  conteudo_tiptap jsonb not null,
  pdf_url text,
  status text not null default 'rascunho'
    check (status in ('rascunho','aguardando_aprovacao','aprovado','recusado','arquivado')),
  enviado_em timestamptz,
  aprovado_em timestamptz,
  aprovacao_meta jsonb,
  prompt_versao text,
  custo_tokens jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_documents_project on public.documents(project_id);

-- ============= ALTERAÇÕES DE ESCOPO =============
create table public.scope_changes (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  solicitado_por text not null check (solicitado_por in ('cliente','profissional')),
  descricao text not null,
  urgencia text check (urgencia in ('baixa','media','alta')),
  valor_aditivo numeric(15,2),
  prazo_adicional_dias int,
  status text not null default 'pendente_analise'
    check (status in ('pendente_analise','aguardando_cliente','aprovado','recusado','cancelado')),
  documento_id uuid references public.documents(id),
  aprovacao_meta jsonb,
  created_at timestamptz not null default now(),
  resolvido_em timestamptz
);
create index idx_scope_changes_project on public.scope_changes(project_id);

-- ============= AUDIT LOG (LGPD) =============
create table public.audit_log (
  id bigserial primary key,
  org_id uuid references public.organizations(id) on delete cascade,
  actor_id uuid references auth.users(id),
  actor_type text default 'user' check (actor_type in ('user','client_portal','system')),
  action text not null,
  entity_type text not null,
  entity_id uuid,
  payload jsonb,
  ip inet,
  user_agent text,
  created_at timestamptz not null default now()
);
create index idx_audit_org_created on public.audit_log(org_id, created_at desc);

-- ============= updated_at trigger helper =============
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_organizations_updated_at
  before update on public.organizations
  for each row execute function public.set_updated_at();

create trigger trg_projects_updated_at
  before update on public.projects
  for each row execute function public.set_updated_at();

create trigger trg_documents_updated_at
  before update on public.documents
  for each row execute function public.set_updated_at();
