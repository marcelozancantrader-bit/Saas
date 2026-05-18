-- =============================================
-- Memorial.ai — D7 Briefing estruturado digital
--
-- Tabela briefings 1:1 com projects. Cliente preenche pelo portal antes do
-- profissional começar o projeto. As respostas viram contexto adicional pros
-- prompts de geração (memorial/caderno/proposta/contrato) numa próxima
-- iteração.
--
-- RLS:
--  - SELECT: members da org OU cliente via portal_token
--  - INSERT/UPDATE/DELETE: só service-role (server actions com validação)
-- =============================================

create table if not exists public.briefings (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null unique references public.projects(id) on delete cascade,
  status text not null default 'aguardando_cliente'
    check (status in ('aguardando_cliente','preenchido','arquivado')),
  enviado_em timestamptz default now(),
  preenchido_em timestamptz,
  respostas jsonb,
  ip inet,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_briefings_project on public.briefings(project_id);

alter table public.briefings enable row level security;

create policy "briefings_select_if_member"
  on public.briefings for select to authenticated
  using (public.is_org_member_of_project(project_id));

create policy "briefings_select_if_portal"
  on public.briefings for select to anon, authenticated
  using (public.is_portal_client_of_project(project_id));
