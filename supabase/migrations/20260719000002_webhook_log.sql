-- =============================================
-- Memorial.ai — Log temporário de webhooks recebidos (debug)
-- Permite verificar SE o Asaas está enviando webhooks pra nossa URL.
-- Apaga depois que o setup estiver validado.
-- =============================================

create table if not exists public.webhook_log (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  event text,
  authorized boolean not null default false,
  payload jsonb,
  headers jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_webhook_log_created
  on public.webhook_log (created_at desc);

-- Sem RLS — só acessamos via service-role (admin client).
alter table public.webhook_log enable row level security;
