-- =============================================
-- Memorial.ai — bucket público para logos das organizações.
-- Path: <org_id>/logo.<ext> — sobrescreve a cada upload (upsert).
-- Read: anyone (público) — logo aparece no portal do cliente (sem auth).
-- Write/Delete: só members da org dona do path.
-- =============================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'org-logos',
  'org-logos',
  true,
  2097152, -- 2 MB
  array['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']
)
on conflict (id) do nothing;

create policy "org_logos_select_public"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'org-logos');

create policy "org_logos_insert_if_member"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'org-logos'
    and public.is_org_member(((storage.foldername(name))[1])::uuid)
  );

create policy "org_logos_update_if_member"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'org-logos'
    and public.is_org_member(((storage.foldername(name))[1])::uuid)
  )
  with check (
    bucket_id = 'org-logos'
    and public.is_org_member(((storage.foldername(name))[1])::uuid)
  );

create policy "org_logos_delete_if_member"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'org-logos'
    and public.is_org_member(((storage.foldername(name))[1])::uuid)
  );
