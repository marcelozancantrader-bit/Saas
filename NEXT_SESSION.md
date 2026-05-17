# Memorial.ai — Estado da sessão (Sprint 1 / Fundação)

**Pausado em:** 2026-05-17
**Plano original:** `C:\Users\zanca\.claude\plans\saas-eng-e-arq-tender-curry.md`
**Source-of-truth do produto:** `C:\Users\zanca\OneDrive\Desktop\Saas\` (`CLAUDE.md`, `PROMPT_CLAUDE_CODE.md`, `ANALISE_MERCADO.md`)

---

## ✅ O que está PRONTO em disco

### Tooling instalado na máquina

- Node v24.15.0 (em `C:\Program Files\nodejs\`)
- npm 11.12.1
- Vercel CLI (`vercel`) — instalado via `npm i -g`
- Supabase CLI — não instalado globalmente; usamos `npx supabase`
- Git 2.54.0 (já existia)

### Configuração inalterada que precisa atenção

- ⚠️ **PowerShell ExecutionPolicy** continua bloqueando `npm.ps1`. Usar `npm.cmd` em PowerShell, ou rodar npm via Bash (`/c/Program Files/nodejs:$PATH`). Auto-mode bloqueou alterar política; usuário pode rodar manualmente: `Set-ExecutionPolicy RemoteSigned -Scope CurrentUser` se quiser.

### Código gerado em `C:\dev\memorial-ai\`

| Camada                               | Arquivos                                                                                                                      | Status                        |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------- | ----------------------------- |
| Scaffold                             | Next.js 16.2.6 + TS strict (`noUncheckedIndexedAccess`, `verbatimModuleSyntax`) + Tailwind 4 + ESLint 9                       | ✅                            |
| Tooling                              | Prettier, Husky pre-commit, lint-staged                                                                                       | ✅                            |
| shadcn/ui                            | button, input, label, card, dialog, sonner, dropdown-menu, avatar, separator, skeleton (base-nova preset)                     | ✅                            |
| Forms                                | react-hook-form, @hookform/resolvers, zod                                                                                     | ✅                            |
| Env validation                       | `lib/validators/env.ts` (zod parse, fail-fast)                                                                                | ✅                            |
| Supabase clients                     | `lib/supabase/{server,client,middleware}.ts` via `@supabase/ssr`                                                              | ✅                            |
| Proxy (Next 16 rename de middleware) | `proxy.ts` na raiz, refresca sessão + gateia `(app)/*`                                                                        | ✅                            |
| Migrations                           | 4 arquivos em `supabase/migrations/`: schema (11 tabelas), RLS (3 com policy, 8 default-deny), signup trigger, storage bucket | ✅ escritas, ⏳ não aplicadas |
| Auth UI                              | `(auth)/{login,signup}/page.tsx`, layout, LoginForm, SignupForm, GoogleOAuthButton, LogoutButton                              | ✅                            |
| Server Actions                       | `server/actions/auth/{login,signup,logout,oauth}.action.ts` + `app/auth/callback/route.ts`                                    | ✅                            |
| App shell                            | `(app)/layout.tsx` (gate + busca org), AppShell, Sidebar, TopBar                                                              | ✅                            |
| Placeholder pages                    | `(app)/{page,projetos,clientes,configuracoes,billing}.tsx`                                                                    | ✅                            |
| Docs                                 | README.md, CLAUDE.md (projeto), 4 ADRs (001 stack, 002 Next 16, 003 trigger, 004 RLS deferral), `docs/backlog.md`             | ✅                            |

### Quality gates passando

- `npx tsc --noEmit` → 0 errors
- `npx eslint --max-warnings 0 .` → 0 errors
- `npx prettier --check .` → all clean

### Git

- Repo inicializado em `C:\dev\memorial-ai\.git`
- ⏳ Nenhum commit feito ainda (faltou `user.email` / `user.name`)
- Todos arquivos `??` (untracked) — nada perdido, só falta `git add && git commit`

---

## ⏳ O que falta para fechar Sprint 1

### 1. Configurar git identity e fazer primeiro commit

```bash
git config --global user.email "<seu-email>"
git config --global user.name "<seu-nome>"
cd C:\dev\memorial-ai
git add -A
git commit -m "feat: bootstrap Memorial.ai (Sprint 1 fundação)"
```

### 2. Preencher `.env.local`

Arquivo já existe em `C:\dev\memorial-ai\.env.local` com placeholders. Coletar do painel Supabase (Settings → API e Settings → Database):

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_DB_URL=postgresql://postgres.<ref>:<password>@aws-0-sa-east-1.pooler.supabase.com:6543/postgres
```

(`ANTHROPIC_API_KEY` é opcional para Sprint 1; pode preencher já que vai ser usado no Sprint 3.)

### 3. Aplicar migrations no Supabase Cloud

```bash
cd C:\dev\memorial-ai
npx supabase login
npx supabase link --project-ref <SEU_PROJECT_REF>
npm run db:push     # aplica os 4 SQLs em supabase/migrations/
```

Sanity check no painel Supabase (Table Editor):

- 11 tabelas em `public` com ícone de escudo (RLS habilitado)
- `organizations`, `organization_members`, `clients` com 2–4 policies cada
- Outras 8 com "0 policies" (default-deny — correto, ver ADR-004)
- Em Auth → Triggers ou via SQL: `select * from pg_trigger where tgname='on_auth_user_created';` → 1 linha
- Em Storage: bucket `project-files` privado existe

### 4. Smoke test local

```bash
npm run dev
# Abrir http://localhost:3000 → deve redirecionar para /login
# Criar conta de teste (Camila) via /signup
# Confirmar email no Supabase Dashboard → Authentication → Users (toggle email_confirmed_at, ou desabilitar email confirmation em Auth → Settings)
# Login → deve cair no dashboard placeholder
# Conferir SQL: select * from organizations; select * from organization_members;
```

### 5. Criar repo GitHub e push

Usuário cria manualmente `memorial-ai` (privado) em github.com, depois:

```bash
cd C:\dev\memorial-ai
git remote add origin https://github.com/<voce>/memorial-ai.git
git branch -M main
git push -u origin main
```

### 6. Deploy Vercel + Google OAuth (estrutura já pronta, basta ativar)

```bash
cd C:\dev\memorial-ai
vercel login
vercel link
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel env add SUPABASE_SERVICE_ROLE_KEY
vercel env add NEXT_PUBLIC_APP_URL          # https://memorial-ai-<id>.vercel.app
vercel env add NEXT_PUBLIC_GOOGLE_OAUTH_ENABLED   # false inicialmente
vercel deploy --prod=false
```

Conectar repo GitHub no Vercel dashboard (auto preview por PR).

**Google OAuth (opcional para fechar DoD):**

1. Google Cloud Console → new project → OAuth consent screen (External, "Memorial.ai", scopes email/profile/openid)
2. Credentials → OAuth Client ID → Web → Authorized redirect URIs:
   - `https://<project-ref>.supabase.co/auth/v1/callback`
   - `http://localhost:3000/auth/callback`
3. Cole `client_id` + `secret` em Supabase → Auth → Providers → Google
4. Vercel: flip `NEXT_PUBLIC_GOOGLE_OAUTH_ENABLED=true` e redeploy

Se atrasar review do consent screen, ficar com flag `false` — DoD só exige a estrutura.

### 7. Validar DoD (RLS cross-tenant)

1. Browser A: signup `arq.camila@example.com` / org "OrgCamilaTeste"
2. Browser B (Incognito): signup `arq.bruno@example.com` / org "OrgBrunoTeste"
3. Como Camila (SQL Editor "Run as user" ou via REST com JWT da Camila):
   ```sql
   insert into public.clients (org_id, nome)
   values (
     (select org_id from public.organization_members where user_id = '<CAMILA_USER_ID>' limit 1),
     'Cliente Teste Camila'
   );
   ```
4. Como Bruno (Run as user):
   ```sql
   select * from public.clients;
   ```
   **Esperado: 0 linhas.** Se vier 1 linha = RLS quebrado = DoD falhou.
5. Mesma query como Camila → 1 linha.

### 8. Final report

Conforme template em `C:\Users\zanca\.claude\plans\saas-eng-e-arq-tender-curry.md` § "Mensagem final ao fim do Sprint 1". Pedir aprovação do usuário antes de começar Sprint 2.

---

## Decisões tomadas que diferem do master prompt

1. **Next.js 16 em vez de 15** (ADR-002). `create-next-app@latest` instalou 16.2.6 em 2026-05-17.
2. **`proxy.ts` em vez de `middleware.ts`** (consequência do Next 16 rename).
3. **shadcn `form` component não existe no preset `base-nova`** — usamos react-hook-form direto com primitives.
4. **shadcn agora usa Base UI, não Radix** — `asChild` foi substituído por `render`. `TopBar.tsx` evita isso usando classes Tailwind inline.
5. **Migrations em `supabase/migrations/`** (convenção CLI), não em `db/migrations/` (spec original).
6. **Projeto em `C:\dev\memorial-ai\`** (FORA do OneDrive), docs ficam em `C:\Users\zanca\OneDrive\Desktop\Saas\`.

---

## Para retomar a sessão de Claude Code

```bash
cd C:\dev\memorial-ai
# Conte para o Claude: "Estamos retomando Sprint 1 do Memorial.ai.
# Leia NEXT_SESSION.md para o estado atual e me ajude a executar os passos pendentes."
```

Claude Code automaticamente lê o `CLAUDE.md` desta pasta a cada sessão, e o `CLAUDE.md` daqui referencia os docs em `C:\Users\zanca\OneDrive\Desktop\Saas\` como source-of-truth.
