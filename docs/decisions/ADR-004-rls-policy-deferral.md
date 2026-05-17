# ADR-004 — RLS habilitado em todas as 11 tabelas; policies completas apenas nas 3 do Sprint 1

**Status:** Aceito · **Data:** 2026-05-17 · **Sprint:** 1

## Contexto

O `PROMPT_CLAUDE_CODE.md` define 11 tabelas no § "Modelo de Dados Completo" mas o Sprint 1 (Fundação) lista entregáveis para apenas 3 tabelas: `organizations`, `organization_members`, `clients`. A Step 5 da "PRIMEIRA AÇÃO" diz "criar migration `001_initial_schema.sql` com **TODAS** as tabelas".

Decisão necessária: aplicar todas as 11 tabelas agora, ou só as 3 do Sprint 1?

## Decisão

**Aplicar TODAS as 11 tabelas na migration `001_initial_schema.sql` agora**, mas:

- Apenas **3 tabelas** recebem **policies RLS completas** no Sprint 1 (`organizations`, `organization_members`, `clients`).
- As outras 8 (`projects`, `project_files`, `budgets`, `budget_items`, `sinapi_compositions`, `documents`, `scope_changes`, `audit_log`) recebem **apenas `enable row level security`** — modo "default-deny" sem nenhuma policy.

As policies das 8 tabelas restantes entrarão na migration do sprint que ativar cada feature:

| Tabela                                           | Sprint                       | Migration prevista                            |
| ------------------------------------------------ | ---------------------------- | --------------------------------------------- |
| `projects`, `project_files`                      | Sprint 2 (F2)                | `02x_projects_rls.sql`                        |
| `budgets`, `budget_items`, `sinapi_compositions` | Sprint 4 (F4)                | `04x_budget_rls.sql`                          |
| `documents`                                      | Sprint 5 e 6 (F5, F6 portal) | `05x_documents_rls.sql`, `06x_portal_rls.sql` |
| `scope_changes`                                  | Sprint 6 (F6)                | `06x_scope_changes_rls.sql`                   |
| `audit_log`                                      | Sprint 8 (LGPD)              | `08x_audit_rls.sql`                           |

## Justificativa

**Por que criar todas as 11 tabelas agora:**

- Schema já está estável (definido no spec final).
- FKs e tipos integram-se entre si — split por sprint exigiria migrations futuras alterando o que já existe (drop/add FK), o que é alto risco e ruído.
- Tabelas vazias com RLS habilitado são **gratuitas** — não consomem armazenamento nem performance.

**Por que NÃO escrever todas as policies agora:**

- Policies precisam ser pensadas com o caso de uso real — escrever no escuro gera erros sutis (ex: portal público precisa de policy diferente do app).
- Cada policy não testada com o fluxo correspondente é dívida — melhor entregá-las junto da feature, com testes.
- Default-deny é **seguro:** sem policy + RLS habilitado = ninguém vê nada via API REST autenticada. É o modo `fail-safe`.

## Consequências

**Positivas:**

- Sprint 1 fecha rápido sem precisar pensar em policies que não vão ser usadas até Sprint 5+.
- Schema completo permite escrever queries e tipos antes — Sprint 2 pula a etapa de migration de schema.
- Default-deny garante que ninguém acesse essas tabelas acidentalmente via REST se um Server Action for desenvolvido errado.

**Negativas:**

- Quem ler o banco no painel Supabase verá tabelas com "0 policies" — pode confundir. Mitigado por este ADR + comentários na migration `002_rls_policies.sql`.
- Migrations futuras adicionando policies precisam lembrar de:
  - Cobrir as 4 operações (select, insert, update, delete) ou ser explícitas sobre escopo.
  - Considerar o portal público (acesso por `portal_token` sem login) onde aplicável (documents, scope_changes).

## Padrão para policies futuras

Helpers `public.is_org_member(uuid)` e `public.is_org_owner_or_admin(uuid)` (definidos em `002_rls_policies.sql`) devem ser reutilizados — eles são `security definer` e evitam recursão em `organization_members`.

Template:

```sql
create policy "<tabela>_select_if_member"
  on public.<tabela> for select
  to authenticated
  using (public.is_org_member(org_id));

create policy "<tabela>_insert_if_member"
  on public.<tabela> for insert
  to authenticated
  with check (public.is_org_member(org_id));

create policy "<tabela>_update_if_member"
  on public.<tabela> for update
  to authenticated
  using (public.is_org_member(org_id))
  with check (public.is_org_member(org_id));

create policy "<tabela>_delete_if_owner_or_admin"
  on public.<tabela> for delete
  to authenticated
  using (public.is_org_owner_or_admin(org_id));
```

## Verificação do DoD do Sprint 1

Mesmo com 8 tabelas sem policies, o DoD é validável:

- Bruno e Camila criam orgs separadas (via signup → trigger).
- Camila insere um `client` (via SQL admin, já que `/clientes` é placeholder).
- Bruno faz `select * from public.clients` autenticado → 0 linhas (RLS de `clients` policy + JWT do Bruno → nada cross-tenant).

## Referências

- [`supabase/migrations/20260517000002_rls_policies.sql`](../../supabase/migrations/20260517000002_rls_policies.sql)
- Supabase RLS docs: https://supabase.com/docs/guides/database/postgres/row-level-security
