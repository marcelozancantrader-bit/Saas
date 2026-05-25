-- =============================================
-- Memorial.ai — Enforcement DB-level de suspend org + webhook_events idempotência
-- P15 (2026-05-25) — Achado da auditoria de segurança:
--   - suspend-org só marcava meta.suspended_at, sem bloqueio em DB
--   - webhook Asaas era idempotente por busca, mas sem audit trail
-- =============================================

-- =============================================
-- PART 1: Função is_org_suspended + trigger DB-level
-- =============================================

create or replace function public.is_org_suspended(p_org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select (meta ->> 'suspended_at') is not null
      from public.organizations
      where id = p_org_id
    ),
    false
  );
$$;

comment on function public.is_org_suspended(uuid) is
  'Retorna true se organizations.meta.suspended_at is not null. Usada em triggers BEFORE INSERT/UPDATE pra bloquear writes em orgs suspensas.';

-- Trigger BEFORE INSERT/UPDATE genérico — qualquer tabela com coluna org_id pode usar.
create or replace function public.reject_if_org_suspended()
returns trigger
language plpgsql
as $$
declare
  v_org_id uuid;
begin
  -- Tenta extrair org_id da row sendo afetada
  v_org_id := (to_jsonb(new) ->> 'org_id')::uuid;
  if v_org_id is null then
    return new;  -- linhas sem org_id passam (não deveria acontecer em tabelas multi-tenant)
  end if;
  if public.is_org_suspended(v_org_id) then
    raise exception 'org_suspended'
      using
        hint = 'Esta organização está suspensa. Contate o suporte.',
        errcode = 'P0001';
  end if;
  return new;
end;
$$;

comment on function public.reject_if_org_suspended() is
  'Trigger function que rejeita INSERT/UPDATE se a org estiver suspensa.';

-- Aplica trigger nas tabelas de write críticas (não em audit_log/notifications
-- pra permitir registrar eventos da suspensão e comunicar ao usuário).
do $$
declare
  t text;
begin
  foreach t in array array[
    'projects',
    'documents',
    'budgets',
    'budget_items',
    'project_files',
    'project_diary_entries',
    'briefings',
    'scope_changes',
    'org_doc_templates',
    'invitations'
  ]
  loop
    execute format('drop trigger if exists reject_writes_if_org_suspended on public.%I', t);
    execute format(
      'create trigger reject_writes_if_org_suspended
       before insert or update on public.%I
       for each row execute function public.reject_if_org_suspended()',
      t
    );
  end loop;
end$$;

-- =============================================
-- PART 2: webhook_events — audit trail + idempotência por unique
-- =============================================

create table if not exists public.webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null check (provider in ('asaas', 'stripe', 'resend', 'zapi', 'turnstile')),
  /** ID único do evento NO PROVIDER (pra dedupe). Ex: Asaas envia event id no body. */
  external_event_id text,
  event_type text not null,
  payload jsonb,
  processed boolean not null default false,
  error text,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  /** Unique parcial: só quando external_event_id existe, evita NULLs colidirem. */
  constraint webhook_events_provider_external_event_id_uniq
    unique (provider, external_event_id)
);

create index if not exists idx_webhook_events_received
  on public.webhook_events (received_at desc);
create index if not exists idx_webhook_events_provider_processed
  on public.webhook_events (provider, processed, received_at desc);

alter table public.webhook_events enable row level security;

-- Sem policies de SELECT pra users normais. Service-role bypassa RLS.
-- Pra admin ver, pode ler via /admin com createAdminClient().

comment on table public.webhook_events is
  'Audit trail + idempotência pra webhooks externos. external_event_id unique evita reprocessamento.';
