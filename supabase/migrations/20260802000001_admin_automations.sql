-- =============================================
-- Memorial.ai — Builder de automações admin (P16)
-- Marcelo desenha automações tipo "quando signup acontecer, me notifique"
-- Engine roda no Inngest. Escopo platform-wide (sem org_id).
-- =============================================

create table if not exists public.admin_automations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  /** { type: string, config: object } — trigger é único por automação. */
  trigger jsonb not null,
  /** React Flow graph: { nodes: [...], edges: [...] }. */
  graph jsonb not null default '{"nodes":[],"edges":[]}'::jsonb,
  enabled boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_run_at timestamptz,
  run_count int not null default 0
);

create index if not exists idx_admin_automations_trigger_type
  on public.admin_automations ((trigger ->> 'type'))
  where enabled = true;

create index if not exists idx_admin_automations_enabled
  on public.admin_automations (enabled);

create table if not exists public.admin_automation_runs (
  id uuid primary key default gen_random_uuid(),
  automation_id uuid not null references public.admin_automations(id) on delete cascade,
  /** Nome do evento que disparou (ex: "signup.created"). */
  triggered_by text not null,
  trigger_payload jsonb,
  status text not null check (status in ('running', 'success', 'failed', 'skipped')),
  /** Array de { node_id, action_type, status, output, error, duration_ms }. */
  steps jsonb not null default '[]'::jsonb,
  started_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists idx_automation_runs_automation_started
  on public.admin_automation_runs (automation_id, started_at desc);

create index if not exists idx_automation_runs_status
  on public.admin_automation_runs (status);

-- RLS: só platform admins (mesma política dos outros recursos /admin/*).
alter table public.admin_automations enable row level security;
alter table public.admin_automation_runs enable row level security;

-- Drop antes de criar pra ser rerun-safe (Postgres não suporta
-- CREATE POLICY IF NOT EXISTS).
drop policy if exists "admin_automations_select_admins" on public.admin_automations;
drop policy if exists "admin_automations_write_admins" on public.admin_automations;
drop policy if exists "admin_automation_runs_select_admins" on public.admin_automation_runs;

create policy "admin_automations_select_admins"
  on public.admin_automations for select
  to authenticated
  using (
    exists (
      select 1 from public.platform_admins pa
      where pa.user_id = auth.uid()
    )
  );

create policy "admin_automations_write_admins"
  on public.admin_automations for all
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

create policy "admin_automation_runs_select_admins"
  on public.admin_automation_runs for select
  to authenticated
  using (
    exists (
      select 1 from public.platform_admins pa
      where pa.user_id = auth.uid()
    )
  );

-- Service-role (admin client) bypassa RLS — runner usa esse cliente.

comment on table public.admin_automations is
  'Automações desenhadas pelo platform admin no /admin/automacoes (P16). Engine: Inngest.';
comment on table public.admin_automation_runs is
  'Histórico de execução de admin_automations. steps é array com output de cada node.';
