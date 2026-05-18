-- =============================================
-- Memorial.ai — Sprint 7 (F7 Dashboard + F8 Billing)
--
-- Adiciona:
--   • subscriptions     — histórico de assinaturas Asaas (current = mais recente
--     com status active). organizations.plano continua sendo a fonte canônica
--     do plano atual (atualizado por webhook).
--   • notifications     — in-app notifications por org_id. user_id null = visível
--     pra todos os members da org.
--
-- Limites por plano são calculados em tempo real (queries em documents/projects)
-- — não precisamos de tabela de counters porque o volume é baixo (<100 docs/mês
-- por escritório no padrão Pro).
-- =============================================

-- 1. subscriptions ----------------------------------------------------------
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  plano text not null check (plano in ('free','pro','studio','agency')),
  status text not null check (status in ('active','past_due','canceled','trialing','pending')),
  provider text not null default 'asaas' check (provider in ('asaas','stripe','manual')),
  provider_customer_id text,
  provider_subscription_id text,
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  meta jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_subscriptions_org on public.subscriptions(org_id);
create index if not exists idx_subscriptions_provider_sub
  on public.subscriptions(provider, provider_subscription_id)
  where provider_subscription_id is not null;

alter table public.subscriptions enable row level security;

create policy "subscriptions_select_if_member"
  on public.subscriptions for select
  to authenticated
  using (public.is_org_member(org_id));

-- INSERT/UPDATE/DELETE só via service-role (webhook handlers / actions). Sem
-- policy authenticated significa default-deny pra usuários.

-- 2. notifications ----------------------------------------------------------
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade, -- null = org-wide
  type text not null,
  -- Conhecidos: document.approved, document.rejected, scope_change.requested,
  -- scope_change.responded, project.stale, document.awaiting_long, plan.upgraded
  title text not null,
  body text,
  link_url text,
  read_at timestamptz,
  meta jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_notifications_org_unread
  on public.notifications(org_id, created_at desc)
  where read_at is null;
create index if not exists idx_notifications_user
  on public.notifications(user_id, created_at desc)
  where user_id is not null;

alter table public.notifications enable row level security;

create policy "notifications_select_if_member"
  on public.notifications for select
  to authenticated
  using (
    public.is_org_member(org_id)
    and (user_id is null or user_id = auth.uid())
  );

-- Members podem marcar as próprias como lidas (read_at).
create policy "notifications_update_if_member_own"
  on public.notifications for update
  to authenticated
  using (
    public.is_org_member(org_id)
    and (user_id is null or user_id = auth.uid())
  )
  with check (
    public.is_org_member(org_id)
    and (user_id is null or user_id = auth.uid())
  );

-- INSERT/DELETE só via service-role.
