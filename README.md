# Memorial.ai

> Copiloto documental por IA para arquitetos e engenheiros autônomos no Brasil. Da planta ao contrato em horas, não semanas.

Resolve **8 dores documentais** específicas (D1–D8) do profissional autônomo: orçamento SINAPI, memorial descritivo, caderno de especificações, proposta comercial, contrato, briefing, controle formal de aditivos, e prova legal de aprovação pelo cliente.

A especificação completa do produto está em `C:\Users\zanca\OneDrive\Desktop\Saas\` (fora do repo, mantida como source-of-truth). Releia `PROMPT_CLAUDE_CODE.md` antes de cada Sprint.

## Stack

- **Frontend:** Next.js 16 (App Router + RSC), TypeScript strict, Tailwind 4, shadcn/ui (Base UI)
- **Backend:** Supabase (Postgres 17 + Auth + Storage + RLS) via `@supabase/ssr`, Server Actions
- **IA (Sprint 3+):** Anthropic Claude Sonnet 4 (principal), OpenAI gpt-4o-mini (fallback)
- **Infra:** Vercel + Supabase Cloud (sa-east-1) + Resend + Asaas + PostHog + Sentry

Decisões registradas em [`docs/decisions/`](docs/decisions/).

## Setup local

Requisitos: Node ≥ 20.9, Git, conta Supabase (projeto em `sa-east-1`).

```bash
# 1. Clone e instale
git clone <repo-url>
cd memorial-ai
npm install

# 2. Variáveis de ambiente
cp .env.example .env.local
# Preencha NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
# SUPABASE_SERVICE_ROLE_KEY, SUPABASE_DB_URL com os valores do seu projeto Supabase.

# 3. Aplicar migrations no banco remoto
npx supabase login
npx supabase link --project-ref <seu-project-ref>
npm run db:push

# 4. Subir o servidor de dev
npm run dev
# → http://localhost:3000
```

## Scripts npm

| Comando             | O que faz                                                   |
| ------------------- | ----------------------------------------------------------- |
| `npm run dev`       | Servidor Next.js em modo desenvolvimento (porta 3000)       |
| `npm run build`     | Build de produção                                           |
| `npm run start`     | Inicia o build de produção                                  |
| `npm run lint`      | ESLint                                                      |
| `npm run typecheck` | `tsc --noEmit`                                              |
| `npm run format`    | Prettier write                                              |
| `npm run db:push`   | Aplica migrations em `supabase/migrations/` no banco remoto |
| `npm run db:diff`   | Gera nova migration a partir das alterações locais          |

## Estrutura

```
app/(auth)         # Rotas públicas (login, signup)
app/(app)          # Rotas autenticadas (dashboard, projetos, clientes, ...)
app/auth/callback  # Callback OAuth (Google etc.)
app/portal/[token] # Portal público do cliente (Sprint 6)

components/ui          # shadcn primitives
components/features    # Componentes por feature (auth, shell, projects, ...)

lib/supabase           # Clients server/client/middleware (@supabase/ssr)
lib/validators         # Schemas zod (env, auth, ...)
lib/utils              # Utilitários puros (safe-redirect, ...)
lib/ai/prompts         # Prompts IA versionados (Sprint 3+)
lib/budget/rules       # Regras de orçamento (Sprint 4)

server/actions         # Server Actions ('use server')
server/jobs            # Inngest workers (Sprint 3+)

supabase/migrations    # Migrations SQL
supabase/config.toml   # Config Supabase CLI

docs/decisions         # ADRs
docs/backlog.md        # Itens fora do escopo das 8 dores
```

## Sprints

| Sprint | Semanas | Foco                                       |
| ------ | ------- | ------------------------------------------ |
| 1      | 1–2     | Fundação (Next + Supabase + Auth + RLS) ✅ |
| 2      | 3–4     | F2 — Projetos e Clientes                   |
| 3      | 5–6     | F3 — Extração de planta por IA             |
| 4      | 7       | F4 — SINAPI + Orçamento                    |
| 5      | 8–9     | F5 — Geração de documentos por IA          |
| 6      | 10      | F6 — Portal do cliente (diferencial)       |
| 7      | 11      | F7 + F8 — Dashboard + Billing Asaas        |
| 8      | 12      | Polish + Beta                              |

## Persona alvo

**Camila** — arquiteta autônoma de Curitiba, 12 projetos/ano, R$ 149/mês sem pestanejar. Toda decisão de UX passa pelo teste: "Camila entenderia isso em 30 segundos sem ler tutorial?"

## Contribuindo

- **Foco brutal nas 8 dores.** Fora delas → `docs/backlog.md`.
- **Atômico:** commits pequenos, PRs focados, Conventional Commits.
- **Sem `any` em TS.** Sem `number` para moeda. Sem entrada externa sem zod.
- **Pare ao fim de cada Sprint** e aguarde aprovação.

Detalhes em [`CLAUDE.md`](CLAUDE.md) e nos ADRs em [`docs/decisions/`](docs/decisions/).
