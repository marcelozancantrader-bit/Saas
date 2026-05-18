-- =============================================
-- Memorial.ai — Sprint 2 (F2): RLS policies for projects + project_files
-- Reuses helpers public.is_org_member() and public.is_org_owner_or_admin() from 002_rls_policies.sql.
-- project_files doesn't carry org_id directly — looked up via projects.org_id.
-- =============================================

-- Helper: is the current user member of the org that owns a given project?
create or replace function public.is_org_member_of_project(target_project uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.projects p
    join public.organization_members m on m.org_id = p.org_id
    where p.id = target_project and m.user_id = auth.uid()
  );
$$;

create or replace function public.is_org_owner_or_admin_of_project(target_project uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.projects p
    join public.organization_members m on m.org_id = p.org_id
    where p.id = target_project
      and m.user_id = auth.uid()
      and m.role in ('owner','admin')
  );
$$;

-- =============================================
-- projects
-- =============================================
create policy "projects_select_if_member"
  on public.projects for select
  to authenticated
  using (public.is_org_member(org_id));

create policy "projects_insert_if_member"
  on public.projects for insert
  to authenticated
  with check (public.is_org_member(org_id));

create policy "projects_update_if_member"
  on public.projects for update
  to authenticated
  using (public.is_org_member(org_id))
  with check (public.is_org_member(org_id));

create policy "projects_delete_if_owner_or_admin"
  on public.projects for delete
  to authenticated
  using (public.is_org_owner_or_admin(org_id));

-- =============================================
-- project_files
-- =============================================
create policy "project_files_select_if_member"
  on public.project_files for select
  to authenticated
  using (public.is_org_member_of_project(project_id));

create policy "project_files_insert_if_member"
  on public.project_files for insert
  to authenticated
  with check (public.is_org_member_of_project(project_id));

create policy "project_files_update_if_member"
  on public.project_files for update
  to authenticated
  using (public.is_org_member_of_project(project_id))
  with check (public.is_org_member_of_project(project_id));

create policy "project_files_delete_if_owner_or_admin"
  on public.project_files for delete
  to authenticated
  using (public.is_org_owner_or_admin_of_project(project_id));
