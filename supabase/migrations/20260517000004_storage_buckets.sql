-- =============================================
-- Memorial.ai — Storage buckets (Sprint 1)
-- Private bucket for project files. Path convention: <org_id>/<project_id>/<filename>
-- Policies enforce org_id from path prefix.
-- =============================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'project-files',
  'project-files',
  false,
  52428800, -- 50 MB
  array[
    'application/pdf',
    'image/png',
    'image/jpeg',
    'image/webp',
    'application/acad',
    'application/dwg',
    'image/vnd.dwg',
    'application/octet-stream'
  ]
)
on conflict (id) do nothing;

-- =============================================
-- storage.objects policies for the project-files bucket
-- Path prefix is interpreted as the org_id (first folder).
-- =============================================

create policy "project_files_select_if_member"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'project-files'
    and public.is_org_member(((storage.foldername(name))[1])::uuid)
  );

create policy "project_files_insert_if_member"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'project-files'
    and public.is_org_member(((storage.foldername(name))[1])::uuid)
  );

create policy "project_files_update_if_member"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'project-files'
    and public.is_org_member(((storage.foldername(name))[1])::uuid)
  )
  with check (
    bucket_id = 'project-files'
    and public.is_org_member(((storage.foldername(name))[1])::uuid)
  );

create policy "project_files_delete_if_owner_or_admin"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'project-files'
    and public.is_org_owner_or_admin(((storage.foldername(name))[1])::uuid)
  );
