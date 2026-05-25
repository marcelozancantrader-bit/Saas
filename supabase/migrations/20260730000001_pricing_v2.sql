-- =============================================
-- Memorial.ai — Pricing v2: nova estrutura de planos + ciclos de cobrança
--
-- Mudanças:
--   1. Renomeia planos (preserva dados): standard → solo, pro_max → studio
--   2. Atualiza check constraints de organizations.plano e subscriptions.plano
--      pra incluir os IDs novos
--   3. Adiciona subscriptions.cycle (monthly | annual | pix_annual) com desconto
--   4. Grandfathering: marca todas as orgs existentes com
--      organizations.meta.grandfathered_until = now + 365d preservando preço atual
--
-- Justificativa: ver PRICING_PROPOSAL.md (commit anterior). TL;DR: mercado BR
-- direto cobra R$79-103 no entry-level, Memorial.ai estava em R$199. Nova
-- estrutura: Free / Solo R$89,90 / Pro R$219,90 / Studio R$499,90 / Agência.
-- =============================================

-- 1. Backfill: rename dados existentes ANTES de mexer no check constraint
update public.organizations
  set plano = 'solo'
  where plano = 'standard';

update public.organizations
  set plano = 'studio'
  where plano = 'pro_max';

update public.subscriptions
  set plano = 'solo'
  where plano = 'standard';

update public.subscriptions
  set plano = 'studio'
  where plano = 'pro_max';

-- 2. Atualiza check constraints com novos IDs (mantém compat de leitura: aceita
--    os antigos também por 30 dias caso haja webhook em voo. Removeremos os
--    antigos numa migration de cleanup depois.)
alter table public.organizations
  drop constraint if exists organizations_plano_check;

alter table public.organizations
  add constraint organizations_plano_check
  check (plano in ('free', 'solo', 'pro', 'studio', 'agency'));

alter table public.subscriptions
  drop constraint if exists subscriptions_plano_check;

alter table public.subscriptions
  add constraint subscriptions_plano_check
  check (plano in ('free', 'solo', 'pro', 'studio', 'agency'));

-- 3. Coluna cycle (mensal/anual/pix-anual)
alter table public.subscriptions
  add column if not exists cycle text not null default 'monthly'
  check (cycle in ('monthly', 'annual', 'pix_annual'));

-- meta.discount_percent armazena % aplicado quando ciclo != monthly
-- (não precisa coluna separada — meta jsonb já existe). Valor sugerido:
-- monthly=0, annual=20, pix_annual=25.

create index if not exists idx_subscriptions_cycle
  on public.subscriptions(org_id, cycle, status);

-- 4. Grandfathering — todas as orgs existentes mantêm preço atual por 12 meses.
--    A UI lê meta.grandfathered_until pra preservar exibição de plano antigo.
update public.organizations
  set meta = coalesce(meta, '{}'::jsonb) || jsonb_build_object(
    'grandfathered_until', (now() + interval '365 days')::text,
    'original_plano', plano,
    'pricing_v2_migrated_at', now()::text
  )
  where plano != 'free';

comment on column public.subscriptions.cycle is
  'Ciclo de cobrança: monthly (mensal, cartão recorrente), annual (anual recorrente -20%), pix_annual (anual via PIX à vista -25%).';
