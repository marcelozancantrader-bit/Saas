-- =============================================
-- Memorial.ai — Reestruturação de pricing tiers
-- (free / standard / pro / pro_max / agency) com posicionamento high-ticket
-- =============================================

-- 1. Migrar usuários existentes (beta — assumimos que ninguém tem assinatura paga ativa)
--    Quem estava em pro/studio/agency volta pra free; o usuário re-escolhe o plano novo.
update public.organizations
  set plano = 'free'
  where plano in ('pro', 'studio', 'agency');

-- 2. Recriar o constraint com os novos valores
alter table public.organizations
  drop constraint if exists organizations_plano_check;

alter table public.organizations
  add constraint organizations_plano_check
  check (plano in ('free', 'standard', 'pro', 'pro_max', 'agency'));
