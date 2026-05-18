-- =============================================
-- Memorial.ai — Sprint 10.1: tag de disciplina em budget_items
-- Permite agrupar/separar o orçamento por disciplina na UI (arquitetônico
-- vs elétrico/hidráulico/estrutural/gás/HVAC) e gerar subtotais.
-- =============================================

alter table public.budget_items
  add column if not exists disciplina text not null default 'architectural'
  check (disciplina in (
    'architectural',
    'electrical',
    'hydraulic',
    'structural',
    'gas',
    'hvac'
  ));

create index if not exists idx_budget_items_budget_disciplina
  on public.budget_items (budget_id, disciplina);

-- Backfill: todos os items existentes são arquitetônicos.
update public.budget_items
  set disciplina = 'architectural'
  where disciplina is null;
