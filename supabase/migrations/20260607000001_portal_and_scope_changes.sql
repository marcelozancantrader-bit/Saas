-- =============================================
-- Memorial.ai — Sprint 6 (F6): Portal do Cliente
--
-- Adiciona:
--   • RLS para scope_changes (org members CRUD; client_portal lê/escreve só os
--     do projeto cujo client.portal_token bate com o setting do request).
--   • Coluna documents.envio_meta jsonb — registra quando o doc foi enviado
--     ao cliente (timestamp, link), para mostrar "aguardando aprovação X dias".
--   • Coluna documents.hash_sha256 text — hash do conteúdo no momento do
--     envio. A aprovação trava esse hash; alterações posteriores criam nova versão.
--   • Função public.client_portal_token_matches(client_id) — usada por policies
--     do portal público (sem login). Lê o claim/setting injetado pela rota.
--
-- O portal NÃO usa policies para fetch principal — usa service-role na route
-- handler de /portal/[token] (que valida o token na entrada). As policies aqui
-- existem para uma camada extra de defesa caso alguém tente abusar do client
-- supabase anon a partir do portal.
-- =============================================

-- 1. Helpers de portal ------------------------------------------------------
-- Lê o setting 'request.portal_token' (string uuid) e checa se algum client
-- com esse token está vinculado ao project_id em questão.
create or replace function public.is_portal_client_of_project(target_project uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
      from public.projects p
      join public.clients  c on c.id = p.client_id
     where p.id = target_project
       and c.portal_token::text = current_setting('request.portal_token', true)
  );
$$;
comment on function public.is_portal_client_of_project(uuid) is
  'True se o request tem setting request.portal_token igual ao portal_token do client do projeto.';

-- 2. Colunas adicionais em documents ---------------------------------------
alter table public.documents
  add column if not exists envio_meta   jsonb,
  add column if not exists hash_sha256  text;

comment on column public.documents.envio_meta  is 'Metadados do envio ao portal (timestamp, url_token). Null = nunca enviado.';
comment on column public.documents.hash_sha256 is 'SHA-256 hex de conteudo_tiptap no envio. Aprovação trava esse hash.';

-- 3. RLS de scope_changes (org members) ------------------------------------
create policy "scope_changes_select_if_member"
  on public.scope_changes for select
  to authenticated
  using (public.is_org_member_of_project(project_id));

create policy "scope_changes_insert_if_member"
  on public.scope_changes for insert
  to authenticated
  with check (public.is_org_member_of_project(project_id));

create policy "scope_changes_update_if_member"
  on public.scope_changes for update
  to authenticated
  using (public.is_org_member_of_project(project_id))
  with check (public.is_org_member_of_project(project_id));

create policy "scope_changes_delete_if_owner_or_admin"
  on public.scope_changes for delete
  to authenticated
  using (public.is_org_owner_or_admin_of_project(project_id));

-- 4. RLS de scope_changes (portal client read+insert) ----------------------
-- Cliente lê só os scope_changes do projeto do seu portal_token.
create policy "scope_changes_select_if_portal"
  on public.scope_changes for select
  to anon, authenticated
  using (public.is_portal_client_of_project(project_id));

-- Cliente cria solicitações no projeto dele (sempre solicitado_por='cliente'
-- e status='pendente_analise' — enforcement na server action).
create policy "scope_changes_insert_if_portal"
  on public.scope_changes for insert
  to anon, authenticated
  with check (public.is_portal_client_of_project(project_id));

-- Cliente atualiza só os scope_changes que estão 'aguardando_cliente' e
-- pertencem ao projeto dele (para registrar a aprovação).
create policy "scope_changes_update_if_portal"
  on public.scope_changes for update
  to anon, authenticated
  using (
    public.is_portal_client_of_project(project_id)
    and status = 'aguardando_cliente'
  )
  with check (public.is_portal_client_of_project(project_id));

-- 5. RLS de documents (portal client read + update aprovacao) --------------
-- Cliente vê só docs com envio_meta preenchido (i.e. enviados ao portal).
-- Status interno (rascunho/aprovado pelo profissional) é independente — o
-- gating é envio_meta, controlado pela action de envio.
create policy "documents_select_if_portal"
  on public.documents for select
  to anon, authenticated
  using (
    public.is_portal_client_of_project(project_id)
    and envio_meta is not null
  );

-- Cliente registra aprovação/recusa em docs enviados que ainda não foram
-- respondidos. A server action filtra os campos permitidos
-- (aprovado_em, aprovacao_meta) e nunca toca status do profissional.
create policy "documents_update_if_portal"
  on public.documents for update
  to anon, authenticated
  using (
    public.is_portal_client_of_project(project_id)
    and envio_meta is not null
    and aprovacao_meta is null
  )
  with check (public.is_portal_client_of_project(project_id));
