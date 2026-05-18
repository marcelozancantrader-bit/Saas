-- =============================================
-- Memorial.ai — Sprint 9: multi-disciplina nos arquivos
-- Adiciona project_files.disciplina (check constraint, default 'architectural').
-- =============================================

alter table public.project_files
  add column if not exists disciplina text not null default 'architectural'
  check (disciplina in (
    'architectural',
    'electrical',
    'hydraulic',
    'structural',
    'gas',
    'hvac'
  ));

-- Index pra listar/filtrar rápido por disciplina dentro de um projeto.
create index if not exists idx_project_files_project_disciplina
  on public.project_files (project_id, disciplina);

-- Backfill explícito (defensivo — coluna já tem default, mas garantimos consistência).
update public.project_files
  set disciplina = 'architectural'
  where disciplina is null;
