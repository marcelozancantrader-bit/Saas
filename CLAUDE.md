@AGENTS.md

# Memorial.ai — Contexto do Projeto

> SaaS B2B vertical para arquitetos e engenheiros autônomos no Brasil. Resolve 8 dores documentais (D1–D8): orçamento SINAPI, memorial descritivo, caderno de especificações, proposta comercial, contrato, briefing, controle formal de aditivos, prova legal de aprovação.

## Documentos-fonte da verdade

A especificação completa do produto fica em `C:\Users\zanca\OneDrive\Desktop\Saas\` (FORA do repo). Releia antes de cada Sprint:

- `CLAUDE.md` — regras inegociáveis, anti-padrões, estrutura de pastas
- `PROMPT_CLAUDE_CODE.md` — features, modelo de dados (11 tabelas), 12-semana sprint plan
- `ANALISE_MERCADO.md` — TAM, concorrentes, dores ranqueadas

## Stack (não-negociável)

- **Frontend:** Next.js 16 + App Router + RSC, TypeScript strict (`noUncheckedIndexedAccess`), Tailwind 4, shadcn/ui, Tanstack Query, Zustand, react-hook-form, zod, Tiptap, react-pdf, recharts
- **Backend:** Supabase (Postgres 16 + Auth + Storage + Realtime + RLS) via `@supabase/ssr`, Server Actions, Inngest
- **IA:** Anthropic Claude Sonnet 4 (padrão), OpenAI gpt-4o-mini (fallback). Prompts versionados em `/lib/ai/prompts/<dom>.v<N>.ts`
- **Infra:** Vercel + Supabase Cloud (sa-east-1) + Resend + Asaas + PostHog + Sentry

> **Nota de versão:** o master prompt original especificou Next.js 15. Em 2026-05-17, `create-next-app@latest` instalou **Next.js 16.2.6** (compatível com App Router/RSC do spec). Decisão registrada em `docs/decisions/ADR-001-stack.md`.

## Regras inegociáveis (extrato — ver Saas/CLAUDE.md completo)

1. Foco brutal nas 8 dores. Fora do escopo → `docs/backlog.md`, NÃO no código.
2. Persona Camila — UX passa pelo teste "Camila entende em 30s?".
3. Brasil-first: SINAPI, NBR, LGPD, PIX via Asaas, ViaCEP, validação CPF/CNPJ algorítmica, moeda via `big.js`.
4. Multi-tenant via RLS rigorosa em toda tabela com `org_id`.
5. IA com guardrails: retorno LLM validado por zod, prompts versionados (v1, v2, nunca sobrescrever), log de tokens/custo, disclaimer obrigatório.
6. Sem `any` em TS. Sem `number` para moeda. Sem entrada externa sem zod.
7. Commits atômicos. Conventional Commits.
8. **Pare ao fim de cada Sprint, aguarde aprovação.**

## Estrutura de pastas (consultar Saas/PROMPT_CLAUDE_CODE.md § "Padrões de Código")

```
app/(auth)         app/(app)          app/portal/[token]   app/api   app/admin
components/ui      components/features
lib/supabase       lib/ai/prompts     lib/budget/rules     lib/pdf   lib/validators   lib/utils
server/actions     server/jobs
db/migrations      db/seed
tests/{unit,integration,e2e}
docs/decisions     docs/backlog.md
```

## Convenções

- Componentes: `PascalCase.tsx`
- Hooks: `useXxx.ts`
- Server Actions: `*.action.ts`
- Schemas zod: `*.schema.ts` próximos ao consumidor
- Prompts IA: `<dom>.v<N>.ts`, sempre `export const PROMPT = ...`
- Sem `any`: use `unknown` + zod
- Em UI props: `undefined`, não `null`
- Conventional Commits: `feat:`, `fix:`, `refactor:`, `docs:`, `chore:`, `test:`

## Comandos

```bash
npm run dev          # Next dev
npm run build        # Next build
npm run typecheck    # tsc --noEmit
npm run lint         # eslint
npm run format       # prettier --write
npm run db:push      # supabase db push
npm run db:diff      # supabase db diff
```

## Em dúvida

1. Reler `Saas/PROMPT_CLAUDE_CODE.md` § relevante
2. Checar `docs/decisions/` — há ADR sobre o assunto?
3. Regra brasileira (NBR, SINAPI, LGPD, PIX, CAU/CREA): **pesquise antes de codar**, nunca chute
4. Ainda assim em dúvida: **pare e pergunte ao usuário**

## Anti-padrões a NÃO fazer

- ❌ Adicionar feature "porque seria legal" (fora das 8 dores)
- ❌ `any` em TS
- ❌ `number` para valores monetários
- ❌ Esquecer RLS em tabela nova
- ❌ Chamar LLM sem timeout, retry e validação zod
- ❌ Sobrescrever prompt existente (criar `.v2.ts`)
- ❌ Fazer features de Sprint futuro adiantadas
- ❌ Commit grande com várias mudanças misturadas

**Somos o copiloto documental para o pequeno escritório de arquitetura/engenharia. Fim.**
