-- =============================================
-- Memorial.ai — Platform admins (super-admin tier)
--
-- Cria a camada de "super admin do SaaS" separada do role org-scoped (owner/admin/member).
-- Membros desta tabela acessam o painel /admin com visão global de TODAS as orgs.
--
-- Seed do founder (Marcelo): rodar manualmente no SQL Editor após aplicar a migration:
--
--   INSERT INTO public.platform_admins (user_id, granted_by, notes)
--   SELECT id, id, 'Founder seed'
--   FROM auth.users
--   WHERE email = 'marcelozancantrader@gmail.com';
--
-- (substitua o e-mail pelo seu de signup no Memorial.ai)
-- =============================================

create table if not exists public.platform_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  granted_by uuid references auth.users(id) on delete set null,
  granted_at timestamptz not null default now(),
  notes text
);

comment on table public.platform_admins is 'Super-admins do SaaS Memorial.ai (acesso ao painel /admin). Tier separado dos roles org-scoped.';
comment on column public.platform_admins.granted_by is 'Quem concedeu o acesso (NULL = seed inicial via SQL)';

-- =============================================
-- Helper: o user atual (ou um user específico) é platform_admin?
-- security definer + stable para ser planner-friendly e bypassar RLS recursiva.
-- =============================================
create or replace function public.is_platform_admin(target_user uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.platform_admins
    where user_id = target_user
  );
$$;

-- =============================================
-- RLS — só platform_admins veem outros platform_admins
-- =============================================
alter table public.platform_admins enable row level security;

create policy "platform_admins_select_self_or_admin"
  on public.platform_admins for select
  to authenticated
  using (user_id = auth.uid() or public.is_platform_admin());

create policy "platform_admins_insert_if_admin"
  on public.platform_admins for insert
  to authenticated
  with check (public.is_platform_admin());

create policy "platform_admins_delete_if_admin"
  on public.platform_admins for delete
  to authenticated
  using (public.is_platform_admin());

-- =============================================
-- Estender audit_log.actor_type para incluir 'platform_admin'
-- =============================================
alter table public.audit_log
  drop constraint if exists audit_log_actor_type_check;

alter table public.audit_log
  add constraint audit_log_actor_type_check
  check (actor_type in ('user','client_portal','system','platform_admin'));

-- Index para queries platform-level (org_id NULL = ação global)
create index if not exists idx_audit_platform_admin
  on public.audit_log(actor_id, created_at desc)
  where actor_type = 'platform_admin';
