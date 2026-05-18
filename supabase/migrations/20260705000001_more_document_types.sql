-- =============================================
-- Memorial.ai — Tier A: 5 novos tipos de documento por IA
--
-- Adiciona ao check constraint de documents.tipo:
--   memorial_estrutural    (NBR 6118, 6122, 9062)
--   memorial_hidrossanitario (NBR 5626, 8160)
--   memorial_eletrico      (NBR 5410)
--   ppci                   (IT Corpo de Bombeiros + NBR 13434, 9077)
--   impermeabilizacao      (NBR 9575, 9574)
--
-- Drop + recreate check é a única forma de alterar enum check em postgres.
-- =============================================

alter table public.documents drop constraint if exists documents_tipo_check;

alter table public.documents add constraint documents_tipo_check
  check (tipo in (
    'briefing',
    'memorial',
    'caderno',
    'proposta',
    'contrato',
    'aditivo',
    'memorial_estrutural',
    'memorial_hidrossanitario',
    'memorial_eletrico',
    'ppci',
    'impermeabilizacao',
    'cronograma'
  ));
