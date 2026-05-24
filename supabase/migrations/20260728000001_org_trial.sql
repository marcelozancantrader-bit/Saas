-- =============================================
-- Memorial.ai — Trial pré-pago de 7 dias
--
-- Adiciona:
--   • organizations.trial_started_at — anti-abuse (1 trial por org lifetime).
--     Se NULL, a org nunca iniciou trial. Se NOT NULL, foi iniciado no instante
--     registrado. Não revertemos isso nem quando o trial expira — é histórico.
--
-- E estende:
--   • subscriptions.provider — aceita o valor 'trial' (além de asaas/stripe/manual)
--     para identificar subs criadas pelo botão "Experimentar Pro grátis".
--
-- O plano atual da org continua sendo controlado por organizations.plano
-- (atualizado em start-trial para 'pro' e revertido para 'free' no cron
-- de expiração). subscriptions.status='trialing' marca o período ativo
-- de teste; o cron expired-trials-cron finaliza a transição.
-- =============================================

-- 1. Coluna anti-abuse em organizations
alter table public.organizations
  add column if not exists trial_started_at timestamptz;

create index if not exists idx_organizations_trial_started_at
  on public.organizations(trial_started_at)
  where trial_started_at is not null;

-- 2. Estende provider em subscriptions
alter table public.subscriptions
  drop constraint if exists subscriptions_provider_check;

alter table public.subscriptions
  add constraint subscriptions_provider_check
  check (provider in ('asaas','stripe','manual','trial'));
