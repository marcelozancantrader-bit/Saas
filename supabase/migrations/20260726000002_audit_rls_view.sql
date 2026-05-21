-- View interna pra auditoria de RLS. Expõe status de cada tabela do
-- schema public + suas policies. Lida via service-role pelo script
-- scripts/audit-rls.ts.
--
-- Não é uma feature do app — é ferramenta de operação. SECURITY DEFINER
-- pra leitura de pg_policies (que requer privilegio elevado).

create or replace view public._audit_rls_status as
select
  t.tablename as table_name,
  t.rowsecurity as rls_enabled,
  coalesce(
    json_agg(
      json_build_object(
        'policyname', p.policyname,
        'cmd', p.cmd,
        'roles', p.roles
      ) order by p.policyname
    ) filter (where p.policyname is not null),
    '[]'::json
  ) as policies
from pg_tables t
left join pg_policies p on p.schemaname = t.schemaname and p.tablename = t.tablename
where t.schemaname = 'public'
  and t.tablename not like 'pg_%'
group by t.tablename, t.rowsecurity
order by t.tablename;

comment on view public._audit_rls_status is
  'Snapshot do status RLS de cada tabela. Usado por scripts/audit-rls.ts pra validação pre-beta.';

-- Restringe acesso: só service-role lê
revoke all on public._audit_rls_status from anon, authenticated;
grant select on public._audit_rls_status to service_role;
