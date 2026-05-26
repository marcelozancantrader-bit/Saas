-- =============================================
-- Memorial.ai — Builder de automações v3 (P18)
-- 1. Coluna meta em admin_automations (cooldown state, last_metric_value, ...)
-- 2. Tabela admin_automation_versions (snapshots do graph pra audit + restore)
-- =============================================

-- 1) meta jsonb
alter table public.admin_automations
  add column if not exists meta jsonb not null default '{}'::jsonb;

-- 2) versions
create table if not exists public.admin_automation_versions (
  id uuid primary key default gen_random_uuid(),
  automation_id uuid not null references public.admin_automations(id) on delete cascade,
  version_number int not null,
  name text not null,
  description text,
  trigger jsonb not null,
  graph jsonb not null,
  /** Sumário curto do que mudou (gerado pelo update.action). */
  change_summary text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create unique index if not exists ux_admin_automation_versions_num
  on public.admin_automation_versions (automation_id, version_number);

create index if not exists idx_admin_automation_versions_recent
  on public.admin_automation_versions (automation_id, created_at desc);

alter table public.admin_automation_versions enable row level security;

-- Drop pra rerun-safe (Postgres não tem CREATE POLICY IF NOT EXISTS)
drop policy if exists "admin_automation_versions_select_admins" on public.admin_automation_versions;
drop policy if exists "admin_automation_versions_write_admins" on public.admin_automation_versions;

create policy "admin_automation_versions_select_admins"
  on public.admin_automation_versions for select
  to authenticated
  using (
    exists (
      select 1 from public.platform_admins pa
      where pa.user_id = auth.uid()
    )
  );

create policy "admin_automation_versions_write_admins"
  on public.admin_automation_versions for all
  to authenticated
  using (
    exists (
      select 1 from public.platform_admins pa
      where pa.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.platform_admins pa
      where pa.user_id = auth.uid()
    )
  );

comment on table public.admin_automation_versions is
  'Snapshots dos graphs de admin_automations (P18). Cada save material gera uma versão. Permite restore.';
comment on column public.admin_automations.meta is
  'Estado mutável da automação: last_fired_at (cooldown), last_metric_value, last_metric_state, etc.';
