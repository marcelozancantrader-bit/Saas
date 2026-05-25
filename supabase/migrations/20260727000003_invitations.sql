-- =============================================
-- Memorial.ai — Sistema de convite de membros
--
-- Desbloqueia escritórios > 1 user. Owner/admin convida por e-mail; o
-- convidado recebe link com token, abre, faz signup ou login, e vira
-- membership na org. Destrava plano Pro Max R$ 699 (multi-user) e
-- futuro Plano Estúdio R$ 999 (5 users).
--
-- Token é UUID secret no link `/convite/<token>`. Convite expira em 7 dias.
-- =============================================

create table if not exists public.invitations (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  email text not null,
  -- Role atribuída quando aceitar (owner não pode ser atribuído via convite)
  role text not null check (role in ('admin', 'member')),
  -- Token usado no link `/convite/<token>`
  token uuid not null unique default gen_random_uuid(),
  invited_by uuid references auth.users(id) on delete set null,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'cancelled', 'expired')),
  expires_at timestamptz not null default (now() + interval '7 days'),
  accepted_at timestamptz,
  accepted_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_invitations_org on public.invitations(org_id);
create index if not exists idx_invitations_token on public.invitations(token);
create index if not exists idx_invitations_email_pending
  on public.invitations(lower(email))
  where status = 'pending';

-- =============================================
-- RLS: owner/admin gerencia convites da própria org;
-- anon pode SELECT por token (pra render landing de aceite).
-- =============================================
alter table public.invitations enable row level security;

drop policy if exists "invitations_select_if_org_admin" on public.invitations;
create policy "invitations_select_if_org_admin"
  on public.invitations for select
  to authenticated
  using (public.is_org_owner_or_admin(org_id));

drop policy if exists "invitations_insert_if_org_admin" on public.invitations;
create policy "invitations_insert_if_org_admin"
  on public.invitations for insert
  to authenticated
  with check (public.is_org_owner_or_admin(org_id));

drop policy if exists "invitations_update_if_org_admin" on public.invitations;
create policy "invitations_update_if_org_admin"
  on public.invitations for update
  to authenticated
  using (public.is_org_owner_or_admin(org_id))
  with check (public.is_org_owner_or_admin(org_id));

-- Convidado lê por token pra ver dados do convite (org_id, email esperado, role)
-- Permitir anon + authenticated; o token UUID é o "segredo" — sem ele nada vaza
drop policy if exists "invitations_select_by_token_public" on public.invitations;
create policy "invitations_select_by_token_public"
  on public.invitations for select
  to anon, authenticated
  using (status = 'pending' and expires_at > now());

comment on table public.invitations is
  'Convites pra novos membros entrarem na org. Token UUID secret no link /convite/<token>. Expira em 7 dias.';
