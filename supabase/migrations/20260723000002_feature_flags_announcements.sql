-- =============================================
-- Memorial.ai — Feature flags + Announcements (Fase 7 do painel admin)
--
-- feature_flags:
--   - org_id NULL = flag global (todas as orgs)
--   - org_id != NULL = override pra org específica
--   - unique (org_id, key) garante 1 valor por (escopo, chave)
--
-- announcements:
--   - audience='all' | 'paid' | 'plan:<planId>' | 'org:<uuid>'
--   - severity informa cor do banner
-- =============================================

create table if not exists public.feature_flags (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references public.organizations(id) on delete cascade,
  key text not null,
  value jsonb not null default 'true'::jsonb,
  expires_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null
);

create unique index if not exists uniq_feature_flag_scope_key
  on public.feature_flags(coalesce(org_id::text, 'global'), key);

create index if not exists idx_feature_flags_org_key
  on public.feature_flags(org_id, key);

comment on table public.feature_flags is 'Feature flags por org (org_id NULL = global). Gerenciado via /admin/feature-flags.';

alter table public.feature_flags enable row level security;

-- Só platform admins gerenciam flags (mas members podem LER as flags da própria org pra UI gating)
create policy "flags_select_member_or_admin"
  on public.feature_flags for select
  to authenticated
  using (
    public.is_platform_admin()
    or (org_id is null)  -- flags globais são públicas pra members logados
    or (org_id is not null and public.is_org_member(org_id))
  );

create policy "flags_manage_if_admin"
  on public.feature_flags for all
  to authenticated
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

create trigger trg_feature_flags_updated_at
  before update on public.feature_flags
  for each row execute function public.set_updated_at();

-- =============================================
-- Announcements
-- =============================================

create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  severity text not null default 'info'
    check (severity in ('info','success','warning','error')),
  audience text not null default 'all',
  link_url text,
  starts_at timestamptz not null default now(),
  expires_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null
);

create index if not exists idx_announcements_active_window
  on public.announcements(starts_at desc)
  where is_active = true;

comment on table public.announcements is 'Anúncios pro topo do app. Audience: all | paid | plan:<id> | org:<uuid>.';

alter table public.announcements enable row level security;

-- Qualquer authenticated lê os ativos (filtragem por audience é client/server-side)
create policy "announcements_select_active"
  on public.announcements for select
  to authenticated
  using (
    public.is_platform_admin()
    or (is_active = true and starts_at <= now() and (expires_at is null or expires_at > now()))
  );

create policy "announcements_manage_if_admin"
  on public.announcements for all
  to authenticated
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

create trigger trg_announcements_updated_at
  before update on public.announcements
  for each row execute function public.set_updated_at();
