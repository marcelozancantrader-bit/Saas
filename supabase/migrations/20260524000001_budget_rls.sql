-- =============================================
-- Memorial.ai — Sprint 4 (F4): RLS policies for budgets + budget_items + sinapi_compositions
-- Reuses helpers from Sprint 1/2 (is_org_member, is_org_member_of_project).
-- =============================================

-- Helper: is the current user member of the org that owns the project that this budget belongs to?
create or replace function public.is_org_member_of_budget(target_budget uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.budgets b
    join public.projects p on p.id = b.project_id
    join public.organization_members m on m.org_id = p.org_id
    where b.id = target_budget and m.user_id = auth.uid()
  );
$$;

-- =============================================
-- sinapi_compositions — reference data, public READ for authenticated users,
-- NO write via app (only seeded via migrations / admin importer).
-- =============================================
create policy "sinapi_select_authenticated"
  on public.sinapi_compositions for select
  to authenticated
  using (true);

-- =============================================
-- budgets — scoped via project.org_id
-- =============================================
create policy "budgets_select_if_member"
  on public.budgets for select
  to authenticated
  using (public.is_org_member_of_project(project_id));

create policy "budgets_insert_if_member"
  on public.budgets for insert
  to authenticated
  with check (public.is_org_member_of_project(project_id));

create policy "budgets_update_if_member"
  on public.budgets for update
  to authenticated
  using (public.is_org_member_of_project(project_id))
  with check (public.is_org_member_of_project(project_id));

create policy "budgets_delete_if_member"
  on public.budgets for delete
  to authenticated
  using (public.is_org_member_of_project(project_id));

-- =============================================
-- budget_items — scoped via budget_id → project_id → org_id
-- =============================================
create policy "budget_items_select_if_member"
  on public.budget_items for select
  to authenticated
  using (public.is_org_member_of_budget(budget_id));

create policy "budget_items_insert_if_member"
  on public.budget_items for insert
  to authenticated
  with check (public.is_org_member_of_budget(budget_id));

create policy "budget_items_update_if_member"
  on public.budget_items for update
  to authenticated
  using (public.is_org_member_of_budget(budget_id))
  with check (public.is_org_member_of_budget(budget_id));

create policy "budget_items_delete_if_member"
  on public.budget_items for delete
  to authenticated
  using (public.is_org_member_of_budget(budget_id));
