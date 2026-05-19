-- =============================================
-- Memorial.ai — Cleanup pós-validação Asaas
-- 1. Dropa tabela debug webhook_log (não precisamos mais)
-- 2. Backfill: cancela todas as subscriptions 'active' antigas, mantendo
--    apenas a mais recente por org (que reflete o plano atual de fato).
-- =============================================

drop table if exists public.webhook_log;

-- Cancela subscriptions active extras — mantém apenas a mais recente por org.
with ranked as (
  select
    id,
    org_id,
    row_number() over (partition by org_id order by created_at desc) as rn
  from public.subscriptions
  where status = 'active'
)
update public.subscriptions
set status = 'canceled', updated_at = now()
where id in (select id from ranked where rn > 1);
