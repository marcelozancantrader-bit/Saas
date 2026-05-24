-- =============================================
-- Memorial.ai — Biblioteca de templates de documento do escritório
--
-- Permite Camila salvar um documento como template (ex: memorial padrão do
-- escritório) e reusar em projetos futuros — sem precisar regerar via IA
-- toda vez. Depois de 5-10 templates, vira lock-in real (NRR > 110%).
--
-- Variáveis simples: {{projeto.nome}}, {{cliente.nome}}, {{cliente.cpf_cnpj}},
-- {{org.nome}}, {{org.profissional_nome}}. Substituídas no momento de usar.
-- =============================================

create table public.org_doc_templates (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  -- Mesmo enum dos documents (sem briefing/aditivo — não fazem sentido como template)
  tipo text not null check (tipo in (
    'memorial','caderno','proposta','contrato','cronograma',
    'memorial_estrutural','memorial_hidrossanitario','memorial_eletrico',
    'ppci','impermeabilizacao'
  )),
  nome text not null,
  -- Conteúdo Tiptap completo. Pode ter placeholders {{var}}.
  conteudo_tiptap jsonb not null,
  -- Origem opcional: id do documento que virou esse template (pra rastreio).
  source_document_id uuid references public.documents(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_org_doc_templates_org_tipo
  on public.org_doc_templates (org_id, tipo, created_at desc);

create or replace function public.tg_org_doc_templates_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_org_doc_templates_updated_at
  before update on public.org_doc_templates
  for each row execute function public.tg_org_doc_templates_set_updated_at();

-- =============================================
-- RLS: membros leem; owner/admin editam.
-- =============================================
alter table public.org_doc_templates enable row level security;

create policy "org_doc_templates_select_if_member"
  on public.org_doc_templates for select
  to authenticated
  using (public.is_org_member(org_id));

create policy "org_doc_templates_insert_if_member"
  on public.org_doc_templates for insert
  to authenticated
  with check (public.is_org_member(org_id));

create policy "org_doc_templates_update_if_owner_or_admin"
  on public.org_doc_templates for update
  to authenticated
  using (public.is_org_owner_or_admin(org_id))
  with check (public.is_org_owner_or_admin(org_id));

create policy "org_doc_templates_delete_if_owner_or_admin"
  on public.org_doc_templates for delete
  to authenticated
  using (public.is_org_owner_or_admin(org_id));

comment on table public.org_doc_templates is
  'Templates de documento salvos pelo escritório. Vira lock-in: depois de 5+ templates, Camila não troca de SaaS.';
