-- =============================================
-- Memorial.ai — Índices pra queries comuns (P15 auditoria de performance)
-- =============================================

-- projects: lista filtrável por tipologia + client_id (usado em /projetos)
create index if not exists idx_projects_tipologia on public.projects(tipologia);
create index if not exists idx_projects_client on public.projects(client_id)
  where client_id is not null;

-- documents: status filter + por project_id (usado em /projetos/[id]/documentos)
create index if not exists idx_documents_status on public.documents(status);
create index if not exists idx_documents_project_status
  on public.documents(project_id, status);

-- scope_changes: filtros por status pendente
create index if not exists idx_scope_changes_status on public.scope_changes(status);

-- subscriptions: lookup pra dashboard/billing por status active
create index if not exists idx_subscriptions_org_status
  on public.subscriptions(org_id, status);

-- notifications: feed por user_id ordenado por created_at desc
create index if not exists idx_notifications_user_created
  on public.notifications(user_id, created_at desc);

-- audit_log: filtro por action (lookup admin)
create index if not exists idx_audit_action_created
  on public.audit_log(action, created_at desc);

comment on index public.idx_projects_tipologia is
  'P15 auditoria — acelera filtro de tipologia em /projetos (era table scan).';
comment on index public.idx_documents_project_status is
  'P15 auditoria — composite pra status tabs em /projetos/[id]/documentos.';
