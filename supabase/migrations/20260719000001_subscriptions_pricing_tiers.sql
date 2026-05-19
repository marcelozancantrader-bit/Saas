-- =============================================
-- Memorial.ai — Sync subscriptions.plano com os pricing tiers novos
-- A migration 20260718000004 atualizou organizations.plano, mas esqueceu
-- de fazer o mesmo na tabela subscriptions, o que estava silenciosamente
-- bloqueando todo INSERT de subscription pra standard/pro_max.
-- =============================================

-- 1. Backfill: qualquer subscription histórica com plano antigo vira free
--    (forma mais segura — em prod estamos em beta sem assinaturas pagas reais).
update public.subscriptions
  set plano = 'free'
  where plano in ('pro', 'studio', 'agency') and status != 'active';

-- 2. Recria o constraint com os 5 valores novos
alter table public.subscriptions
  drop constraint if exists subscriptions_plano_check;

alter table public.subscriptions
  add constraint subscriptions_plano_check
  check (plano in ('free', 'standard', 'pro', 'pro_max', 'agency'));
