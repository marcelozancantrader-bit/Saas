-- =============================================
-- Memorial.ai — Portfólio público do escritório
--
-- Permite que cada org publique um portfólio em `/p/<slug>` com seus projetos
-- aprovados/concluídos visíveis. Diferencial competitivo + SEO/aquisição.
--
-- Modelo opt-in em 2 camadas:
--   1. Org liga `portfolio_enabled` e escolhe um `portfolio_slug` único.
--   2. Por projeto, owner/admin marca `portfolio_visible=true` pra incluir.
--
-- Acesso anônimo (anon role) — service-role lê tudo via portfolio-loader.ts.
-- Não criamos policy anon: a página pública usa service-role + valida slug.
-- RLS de members existente continua barrando acesso autenticado cross-org.
-- =============================================

-- 1. Slug único do portfólio. NULL = nunca configurou.
alter table public.organizations
  add column if not exists portfolio_slug text;

-- Slug com formato kebab-case (validamos na aplicação; aqui só garantimos unicidade).
create unique index if not exists idx_organizations_portfolio_slug
  on public.organizations(lower(portfolio_slug))
  where portfolio_slug is not null;

-- 2. Liga/desliga o portfólio inteiro sem perder o slug.
alter table public.organizations
  add column if not exists portfolio_enabled boolean not null default false;

-- 3. Por projeto: marca pra aparecer no portfólio.
alter table public.projects
  add column if not exists portfolio_visible boolean not null default false;

-- Index parcial pra acelerar o load público (poucos projetos por org tendem
-- a estar marcados como visíveis — index só sobre eles).
create index if not exists idx_projects_portfolio_visible
  on public.projects(org_id, created_at desc)
  where portfolio_visible = true;

comment on column public.organizations.portfolio_slug is
  'Slug kebab-case único pra rota pública /p/<slug>. Null se a org nunca configurou.';

comment on column public.organizations.portfolio_enabled is
  'Master switch do portfólio. Mesmo com slug definido, só publica se este flag estiver true.';

comment on column public.projects.portfolio_visible is
  'Por projeto: aparece no portfólio público da org quando true E portfolio_enabled da org for true.';
