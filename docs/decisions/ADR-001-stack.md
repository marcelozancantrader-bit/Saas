# ADR-001 — Stack tecnológico

**Status:** Aceito · **Data:** 2026-05-17 · **Sprint:** 1

## Contexto

Estamos construindo um SaaS B2B vertical (Memorial.ai) para arquitetos e engenheiros autônomos brasileiros. Requisitos não-funcionais relevantes:

- **Multi-tenant** com isolamento rígido por organização.
- **Compliance Brasil:** LGPD, SINAPI (Caixa), NBR, PIX, CAU/CREA, validação CPF/CNPJ.
- **IA** como núcleo do produto (Sprint 3+) — extração de planta, geração de documentos.
- **Jobs assíncronos** para processamento pesado (PDFs, importação SINAPI mensal).
- **PDF generation** com identidade visual do escritório.
- **Portal público** acessível por token, sem login (cliente do escritório).
- **Orçamentos** em valores monetários (sem perda de precisão).
- **Sprint 1 → MVP em 12 semanas**, time pequeno: privilegiar velocidade de iteração.

## Decisão

A stack abaixo é **não-negociável** para o V0/MVP, conforme `PROMPT_CLAUDE_CODE.md`:

### Frontend

- **Next.js 16** (App Router, RSC) — ver [ADR-002](ADR-002-nextjs-16.md) sobre o bump de versão
- TypeScript strict (`noUncheckedIndexedAccess`, `verbatimModuleSyntax`)
- Tailwind 4 + shadcn/ui (Base UI, preset `base-nova`)
- Tanstack Query (a partir do Sprint 2, quando houver dado a buscar)
- Zustand (estado client mínimo, a partir do Sprint 2)
- react-hook-form + zod
- Tiptap (Sprint 5 — editor de documentos)
- react-pdf / @react-pdf/renderer (Sprint 4+)
- recharts (Sprint 7 — KPIs)

### Backend

- Supabase (Postgres 17 + Auth + Storage + Realtime + RLS) via `@supabase/ssr`
- Server Actions Next.js (preferidos sobre API routes)
- Inngest (Sprint 3+ — jobs assíncronos)

### IA

- Anthropic Claude Sonnet 4 (principal, Sprint 3+)
- OpenAI gpt-4o-mini (fallback / tarefas baratas)
- Tool use / structured outputs sempre que possível
- Prompts versionados em `.ts` (`<dom>.v<N>.ts`)

### Infraestrutura

- Vercel (frontend + edge)
- Supabase Cloud (sa-east-1)
- Resend (Sprint 6+ — e-mails)
- Asaas (Sprint 7 — pagamentos BR)
- PostHog (Sprint 8 — analytics) + Sentry (Sprint 8 — errors)

### Bibliotecas auxiliares

- date-fns (datas em pt-BR)
- **big.js** para operações monetárias — `number` é PROIBIDO para moeda
- zod para TODA entrada externa
- papaparse + xlsx para importação SINAPI (Sprint 4)

## Consequências

**Positivas:**

- Stack moderna e largamente documentada — onboarding rápido.
- Supabase entrega Auth + DB + Storage + RLS num único produto — reduz complexidade e custo.
- `@supabase/ssr` + Server Actions é o padrão recomendado para Next 13+ App Router.
- Vercel sa-east-1 deploy automático por PR.
- Tipos compartilhados entre frontend/backend via mesmo `Database` gerado.

**Negativas / trade-offs:**

- Lock-in moderado em Supabase (mas Postgres + Auth são portáveis).
- Vercel pode ficar caro com volume — re-avaliar antes de Sprint 8 se billing acende.
- Tailwind 4 + Base UI são novos — algumas APIs de migração ainda em fluxo (ver ADR-002).
- LLM custos: orçados em USD 0.20/doc, monitorar via PostHog (Sprint 8).

## Alternativas consideradas

- **NestJS + Postgres separado em vez de Supabase**: rejeitado — duplica trabalho (Auth, Storage, RLS).
- **Astro / SvelteKit em vez de Next.js**: rejeitado — Server Actions e ecossistema de IA são mais maduros em Next.
- **MUI / Mantine em vez de shadcn**: rejeitado — shadcn permite controle total do código gerado, sem dependência de bundle pesado.
- **Stripe primário em vez de Asaas**: rejeitado para o mercado BR — PIX nativo, boleto, sem IOF, suporte a CNPJ. Stripe fica opcional para clientes internacionais.

## Referências

- `C:\Users\zanca\OneDrive\Desktop\Saas\PROMPT_CLAUDE_CODE.md` § "STACK TÉCNICO"
- [Supabase SSR Auth](https://supabase.com/docs/guides/auth/server-side/nextjs)
- [shadcn/ui Base UI](https://ui.shadcn.com/)
