-- =============================================
-- Memorial.ai — RLS policies (Sprint 1)
-- Enable RLS on all 11 tables (default-deny).
-- Full policies for the 3 tables touched by Sprint 1: organizations, organization_members, clients.
-- Other 8 ship with RLS enabled but no policies — they get them in their respective sprints (see ADR-004).
-- =============================================

-- Enable RLS everywhere
alter table public.organizations         enable row level security;
alter table public.organization_members  enable row level security;
alter table public.clients               enable row level security;
alter table public.projects              enable row level security;
alter table public.project_files         enable row level security;
alter table public.budgets               enable row level security;
alter table public.budget_items          enable row level security;
alter table public.sinapi_compositions   enable row level security;
alter table public.documents             enable row level security;
alter table public.scope_changes         enable row level security;
alter table public.audit_log             enable row level security;

-- =============================================
-- Helper: is the current user a member of <org_id>?
-- security definer + stable so it's planner-friendly and bypasses RLS recursion on organization_members.
-- =============================================
create or replace function public.is_org_member(target_org uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.organization_members
    where org_id = target_org and user_id = auth.uid()
  );
$$;

create or replace function public.is_org_owner_or_admin(target_org uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.organization_members
    where org_id = target_org
      and user_id = auth.uid()
      and role in ('owner','admin')
  );
$$;

-- =============================================
-- organizations
-- =============================================
create policy "orgs_select_if_member"
  on public.organizations for select
  to authenticated
  using (public.is_org_member(id));

create policy "orgs_update_if_owner_or_admin"
  on public.organizations for update
  to authenticated
  using (public.is_org_owner_or_admin(id))
  with check (public.is_org_owner_or_admin(id));

-- INSERT is performed by the signup trigger (security definer); no RLS policy required for end-users.
-- DELETE is intentionally not allowed via RLS in Sprint 1 (account closure handled separately in Sprint 8 LGPD).

-- =============================================
-- organization_members
-- =============================================
create policy "members_select_same_org"
  on public.organization_members for select
  to authenticated
  using (public.is_org_member(org_id));

create policy "members_manage_if_owner_or_admin"
  on public.organization_members for all
  to authenticated
  using (public.is_org_owner_or_admin(org_id))
  with check (public.is_org_owner_or_admin(org_id));

-- =============================================
-- clients
-- =============================================
create policy "clients_select_if_member"
  on public.clients for select
  to authenticated
  using (public.is_org_member(org_id));

create policy "clients_insert_if_member"
  on public.clients for insert
  to authenticated
  with check (public.is_org_member(org_id));

create policy "clients_update_if_member"
  on public.clients for update
  to authenticated
  using (public.is_org_member(org_id))
  with check (public.is_org_member(org_id));

create policy "clients_delete_if_owner_or_admin"
  on public.clients for delete
  to authenticated
  using (public.is_org_owner_or_admin(org_id));

-- =============================================
-- TODO (Sprints futuros): policies for the 8 remaining tables.
-- They are default-deny until their respective sprint adds policies:
--   - projects, project_files          -> Sprint 2 (F2)
--   - budgets, budget_items            -> Sprint 4 (F4)
--   - sinapi_compositions              -> Sprint 4 (F4) — public read
--   - documents                        -> Sprints 5–6 (F5, F6 portal)
--   - scope_changes                    -> Sprint 6 (F6)
--   - audit_log                        -> Sprint 8 (LGPD)
-- See docs/decisions/ADR-004-rls-policy-deferral.md
-- =============================================
