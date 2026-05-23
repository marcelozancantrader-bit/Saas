-- =============================================
-- Memorial.ai — Diário de obra (Sprint posterior ao MVP)
-- Tabela project_diary_entries pra registrar marcos da obra com
-- fotos + notas + tags + opt-in pra exibir no portal do cliente.
--
-- Fotos vivem no bucket existente `project-files` com path:
--   <org_id>/<project_id>/diary/<entry_id>-<seq>.jpg
-- Policies do bucket já cobrem isso (org_id no primeiro nível).
-- =============================================

create table public.project_diary_entries (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  titulo text not null,
  body text,
  -- Quando o marco aconteceu (não confundir com created_at).
  -- Default agora, mas usuário pode editar pra data passada.
  registrado_em timestamptz not null default now(),
  -- Localização opcional (vinda do EXIF ou preenchida manualmente).
  lat numeric(10, 7),
  lng numeric(10, 7),
  local_label text,
  -- Paths das fotos no bucket project-files.
  -- Array vazio é válido (entrada texto sem foto).
  photo_paths text[] not null default '{}',
  -- Tags livres pra categorizar (marco, problema, antes-aditivo, etc).
  tags text[] not null default '{}',
  -- Opt-in pra aparecer no portal do cliente.
  portal_visible boolean not null default false,
  -- Autoria.
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_project_diary_project
  on public.project_diary_entries (project_id, registrado_em desc);

create index idx_project_diary_portal
  on public.project_diary_entries (project_id)
  where portal_visible = true;

-- Trigger updated_at
create or replace function public.tg_project_diary_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_project_diary_updated_at
  before update on public.project_diary_entries
  for each row execute function public.tg_project_diary_set_updated_at();

-- =============================================
-- RLS: membros da org veem/editam tudo do projeto;
-- cliente via portal vê só entradas com portal_visible=true.
-- =============================================
alter table public.project_diary_entries enable row level security;

create policy "project_diary_select_if_member"
  on public.project_diary_entries for select
  to authenticated
  using (public.is_org_member_of_project(project_id));

create policy "project_diary_insert_if_member"
  on public.project_diary_entries for insert
  to authenticated
  with check (public.is_org_member_of_project(project_id));

create policy "project_diary_update_if_member"
  on public.project_diary_entries for update
  to authenticated
  using (public.is_org_member_of_project(project_id))
  with check (public.is_org_member_of_project(project_id));

create policy "project_diary_delete_if_member"
  on public.project_diary_entries for delete
  to authenticated
  using (public.is_org_member_of_project(project_id));

-- Portal: cliente vê só o que foi explicitamente marcado pra ele.
-- Helper is_portal_client_of_project já existe desde Sprint 6.
create policy "project_diary_select_if_portal"
  on public.project_diary_entries for select
  to anon
  using (
    portal_visible = true
    and public.is_portal_client_of_project(project_id)
  );

comment on table public.project_diary_entries is
  'Diário de obra: registros cronológicos com fotos e notas. Resolve D7 (prova de marcos pra aditivo) + D8 (prova legal de estado da obra).';
