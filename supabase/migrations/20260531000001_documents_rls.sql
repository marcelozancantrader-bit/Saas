-- =============================================
-- Memorial.ai — Sprint 5 (F5): RLS policies for documents
-- documents.project_id → projects.org_id → organization_members.user_id
-- Reuses public.is_org_member_of_project from Sprint 2.
-- =============================================

create policy "documents_select_if_member"
  on public.documents for select
  to authenticated
  using (public.is_org_member_of_project(project_id));

create policy "documents_insert_if_member"
  on public.documents for insert
  to authenticated
  with check (public.is_org_member_of_project(project_id));

create policy "documents_update_if_member"
  on public.documents for update
  to authenticated
  using (public.is_org_member_of_project(project_id))
  with check (public.is_org_member_of_project(project_id));

create policy "documents_delete_if_owner_or_admin"
  on public.documents for delete
  to authenticated
  using (public.is_org_owner_or_admin_of_project(project_id));

-- Add an index on (project_id, tipo, versao) for fast version lookups
create index if not exists idx_documents_project_tipo_versao
  on public.documents (project_id, tipo, versao desc);
