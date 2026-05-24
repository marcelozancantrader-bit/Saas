-- =============================================
-- Memorial.ai — Aprovação hierárquica interna do documento
--
-- Permite que member solicite revisão de owner/admin antes de mandar pro
-- cliente. Util pra escritórios onde estagiário/júnior gera doc e sênior
-- valida. Justifica plano com >1 user.
--
-- Fluxo:
--  rascunho → aguardando_revisao_interna → rascunho (aprovado) → aguardando_aprovacao (cliente)
--                                       ↘ rascunho (recusado com comentário)
-- =============================================

-- Estende check constraint de documents.status pra incluir o novo status
alter table public.documents drop constraint if exists documents_status_check;
alter table public.documents add constraint documents_status_check check (
  status in (
    'rascunho',
    'aguardando_revisao_interna',
    'aguardando_aprovacao',
    'aprovado',
    'recusado',
    'arquivado'
  )
);

-- Adiciona coluna pra meta da revisão interna (quem solicitou, quem aprovou,
-- comentários, timestamps). NULL = nunca foi solicitada revisão.
alter table public.documents
  add column if not exists revisao_interna_meta jsonb;

comment on column public.documents.revisao_interna_meta is
  'Meta da revisão interna: { solicitada_por, solicitada_em, decidida_por, decidida_em, decisao (aprovada|recusada), comentario }';
