# ADR-003 — Signup atômico via Postgres trigger (não Server Action com service role)

**Status:** Aceito · **Data:** 2026-05-17 · **Sprint:** 1

## Contexto

O signup do Memorial.ai precisa criar atomicamente três registros: `auth.users` + `public.organizations` + `public.organization_members(role=owner)`. Falha parcial em qualquer um deixa o usuário órfão (sem org) ou cria uma org sem dono — ambos são estados inválidos do app.

## Decisão

Criar um **trigger Postgres `after insert on auth.users`** que insere a organização e o membership na mesma transação. O nome do escritório (`org_name`) é passado pelo formulário via `auth.signUp({ options: { data: { org_name } } })` → Supabase persiste em `raw_user_meta_data` → trigger lê de lá.

Implementação em `supabase/migrations/20260517000003_signup_trigger.sql`.

## Alternativas rejeitadas

### ❌ Server Action com service role

```ts
"use server";
const supabaseAdmin = createClient(URL, SERVICE_ROLE);
await supabaseAdmin.auth.admin.createUser(...);
await supabaseAdmin.from('organizations').insert(...);
await supabaseAdmin.from('organization_members').insert(...);
```

Por quê não:

1. **Não-transacional:** três round-trips REST sem atomicidade. Falha entre passos = órfãos.
2. **Service-role key no runtime Next.js** = chave master exposta a todo o bundle de produção. Qualquer bug de log/sentry/console pode vazar.
3. Mais código pra revisar e bug-fixar.

### ❌ Edge Function

Mesma falta de transação com `auth.users` — Edge Function é HTTP, não SQL. Acrescenta uma camada de deploy/CI sem ganho.

### ✅ Trigger Postgres `security definer`

Razões para escolher:

1. **Atômico por construção:** roda na mesma transação do `insert into auth.users`. Se algo falhar, o INSERT do usuário é rolled back junto.
2. **Service role zero:** o app só usa anon key. O privilégio fica no banco, isolado.
3. **Padrão oficial do Supabase** ([docs](https://supabase.com/docs/guides/auth/managing-user-data#using-triggers)).
4. **Mesmo path cobre OAuth:** Google signup também passa por `auth.users` → trigger → org criada.

## Detalhes da implementação

```sql
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_name text;
  v_org_id uuid;
begin
  v_org_name := coalesce(
    nullif(trim(new.raw_user_meta_data->>'org_name'), ''),
    split_part(new.email, '@', 1)
  );
  insert into public.organizations (name) values (v_org_name) returning id into v_org_id;
  insert into public.organization_members (org_id, user_id, role, accepted_at)
  values (v_org_id, new.id, 'owner', now());
  return new;
end;
$$;
```

- **`security definer`** + **`set search_path = public`** — necessário para escapar do search_path do usuário invocador (sem isso, é uma vulnerabilidade clássica de privilege escalation).
- **`exception when others`** captura erros e levanta `warning` em vez de bloquear o signup do usuário — degradação graceful. Recuperação manual via admin se acontecer.

## Consequências

**Positivas:**

- Signup robusto a falhas de rede entre passos.
- Service-role permanece no Supabase CLI / migrations apenas.
- Mesma lógica para email/senha e Google OAuth.

**Negativas:**

- Lógica de negócio no banco, separada do código TS — quem ler só o frontend não vê o que acontece no signup.
- Mitigado por: este ADR + comentário no `supabase/migrations/.../003_signup_trigger.sql` + nota em `CLAUDE.md`.
- Mudanças no comportamento de signup exigem nova migration (não basta editar o código TS).

## Riscos e mitigações

- **Trigger silenciar erro:** o `exception when others` raise warning, mas user é criado mesmo se a org falhar → usuário fica órfão. Mitigação Sprint 1: o `(app)/layout.tsx` detecta ausência de membership e redireciona para `/login?error=no_org`. Sprint futuro: dashboard interno mostrando órfãos para reparo manual.

## Referências

- [Supabase — Managing user data](https://supabase.com/docs/guides/auth/managing-user-data)
- [`supabase/migrations/20260517000003_signup_trigger.sql`](../../supabase/migrations/20260517000003_signup_trigger.sql)
