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
-- ⚠️ ORDEM CRÍTICA: o constraint antigo (free/standard/pro/pro_max/agency) NÃO
-- aceita os IDs novos (solo/studio), então DROPAMOS o constraint ANTES dos
-- UPDATEs — senão UPDATE plano='studio' falha violando o constraint vigente.
-- Esse foi o motivo do primeiro tente: aplicação falhou no UPDATE inicial.
--
-- Justificativa de pricing: ver PRICING_PROPOSAL.md.
-- TL;DR: mercado BR direto cobra R$79-103 no entry-level, Memorial.ai
-- estava em R$199. Nova estrutura: Free / Solo R$89,90 / Pro R$219,90 /
-- Studio R$499,90 / Agência.
-- =============================================

-- 1. Drop constraints PRIMEIRO — libera os UPDATEs com IDs novos
alter table public.organizations
  drop constraint if exists organizations_plano_check;

alter table public.subscriptions
  drop constraint if exists subscriptions_plano_check;

-- 2. Backfill: rename dados existentes
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

-- 3. Adiciona constraints novos
alter table public.organizations
  add constraint organizations_plano_check
  check (plano in ('free', 'solo', 'pro', 'studio', 'agency'));

alter table public.subscriptions
  add constraint subscriptions_plano_check
  check (plano in ('free', 'solo', 'pro', 'studio', 'agency'));

-- 4. Coluna cycle (mensal/anual/pix-anual)
alter table public.subscriptions
  add column if not exists cycle text not null default 'monthly'
  check (cycle in ('monthly', 'annual', 'pix_annual'));

-- meta.discount_percent armazena % aplicado quando ciclo != monthly
-- (não precisa coluna separada — meta jsonb já existe). Valor sugerido:
-- monthly=0, annual=20, pix_annual=25.

create index if not exists idx_subscriptions_cycle
  on public.subscriptions(org_id, cycle, status);

-- 5. Grandfathering — todas as orgs existentes mantêm preço atual por 12 meses.
--    A UI lê meta.grandfathered_until pra preservar exibição de plano antigo.
--    Idempotente: só atualiza quem ainda não tem o marker (caso a migration
--    rode 2x).
update public.organizations
  set meta = coalesce(meta, '{}'::jsonb) || jsonb_build_object(
    'grandfathered_until', (now() + interval '365 days')::text,
    'original_plano', plano,
    'pricing_v2_migrated_at', now()::text
  )
  where plano != 'free'
    and (meta->>'pricing_v2_migrated_at') is null;

comment on column public.subscriptions.cycle is
  'Ciclo de cobrança: monthly (mensal, cartão recorrente), annual (anual recorrente -20%), pix_annual (anual via PIX à vista -25%).';
