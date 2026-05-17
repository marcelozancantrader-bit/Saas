# ADR-002 — Adotar Next.js 16 (em vez de Next.js 15 conforme spec)

**Status:** Aceito · **Data:** 2026-05-17 · **Sprint:** 1

## Contexto

O master prompt (`PROMPT_CLAUDE_CODE.md` § "STACK TÉCNICO") especifica:

> **Next.js 15** (App Router, RSC)

Quando rodei `npx create-next-app@latest` em 2026-05-17, a versão instalada foi **Next.js 16.2.6** (release recente, posterior à escrita do spec).

## Decisão

Adotar Next.js 16, **não** fazer downgrade para 15.

## Justificativa

- O spec foi escrito quando Next 15 era o estável; Next 16 é o sucessor compatível com App Router + RSC, padrão arquitetural que o spec exige.
- Downgrade exige `next@15` manualmente, fica desalinhado com `eslint-config-next` que casa com `next@latest`, e adiciona dívida (futuras atualizações vão pedir o bump de qualquer forma).
- Next 16 traz melhorias relevantes para o nosso caso (cache components, Turbopack como padrão, runtime nodejs para o `proxy.ts`).

## Breaking changes do Next 16 que afetam este projeto

| Mudança                                                                | Impacto                                                                                                    |
| ---------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `middleware.ts` → **`proxy.ts`** (named export `middleware` → `proxy`) | Adotado em `proxy.ts`. Runtime forçado em `nodejs` (não pode mais ser `edge`) — alinhado com Supabase SSR. |
| Node.js mínimo 20.9                                                    | OK (estamos em 24.15).                                                                                     |
| TypeScript mínimo 5.1                                                  | OK (estamos em 5+).                                                                                        |
| `images.localPatterns.search`                                          | Não usamos query strings em imagens locais — sem impacto.                                                  |
| Cache Components                                                       | Não usado no Sprint 1 — avaliar em Sprint 7 quando dashboard tiver KPIs reais.                             |

A migração futura para Next 17 quando sair pode ser feita via codemod oficial (`@next/codemod`).

## Consequências

**Positivas:**

- Em sintonia com o ecossistema atual; updates do shadcn/Vercel/Supabase docs assumem Next 16.
- `proxy.ts` no runtime `nodejs` casa naturalmente com `@supabase/ssr` (que precisa de Node APIs).

**Negativas:**

- Tutoriais ainda referenciam `middleware.ts` — desenvolvedores novos precisam saber do rename.
- Alguma documentação third-party (ex.: shadcn `form`) pode estar defasada — vimos isso ao adicionar componentes (`form` registry entry não existe no preset `base-nova`).

## Notas para futuros agentes

- O arquivo do middleware é **`proxy.ts`** na raiz, função exportada chama-se **`proxy`**.
- shadcn/ui agora usa **Base UI** (`@base-ui/react/menu`), não Radix UI. O prop `asChild` foi substituído por **`render={<X />}`**. Ver `components/features/shell/TopBar.tsx` para o pattern de evitar wrappers (inline Tailwind classes em vez de wrapper `<Button>`).
- O componente `form` (`FormField`, `FormItem`, `FormLabel`) **não existe** no preset `base-nova`. Usamos react-hook-form direto com `<Input>`, `<Label>`, `<Button>` primitives.

## Referências

- `node_modules/next/dist/docs/01-app/02-guides/upgrading/version-16.md`
- [Next.js 16 release notes](https://nextjs.org/blog/next-16)
