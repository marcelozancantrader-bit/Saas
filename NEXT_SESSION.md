# Memorial.ai — Estado da sessão

**Última pausa:** 2026-05-18 (Sprint 5 WIP — código pronto, faltam DoD live + deploy + tag)
**Source-of-truth do produto:** `C:\Users\zanca\OneDrive\Desktop\Saas\` (`CLAUDE.md`, `PROMPT_CLAUDE_CODE.md`, `ANALISE_MERCADO.md`)
**Plano original:** `C:\Users\zanca\.claude\plans\saas-eng-e-arq-tender-curry.md`

---

## ✅ Sprints concluídos (4 de 8)

| Sprint                                                        | Tag             | DoD                                    | Commit final        |
| ------------------------------------------------------------- | --------------- | -------------------------------------- | ------------------- |
| 1 — Fundação (Next 16 + Supabase + Auth + RLS)                | `sprint-1-done` | 8/8 RLS cross-tenant clients           | `cc1ea0d`/`8176c49` |
| 2 — F2 Projetos/Clientes (CRUD + ViaCEP + CPF/CNPJ + Storage) | `sprint-2-done` | 8/8 RLS projects/files/Storage         | `e8cca8e`           |
| 3 — F3 Extração planta IA (Claude Sonnet 4.6 + Inngest)       | `sprint-3-done` | 4/4 schema + live: 92.5m²/7.6s/$0.0198 | `2460113`           |
| 4 — F4 SINAPI + Orçamento (heurístico, sem IA)                | `sprint-4-done` | 9 asserts: 29 itens R$193k/656ms + RLS | `cb7bc6d`           |

**Últimos commits úteis:**

- `12d26c6` — fix redirect em Server Actions (Edge "page couldn't load")
- `436725a` — fix env validator (process.env iteration bug)
- `9825c89` — **Sprint 5 WIP** (código completo, DoD não rodou)

---

## ⏳ Sprint 5 — Documentos por IA (em validação)

**Status:** código pronto e em prod (commit `9825c89` deployado em Vercel via deploy automático? NÃO — ainda precisa rodar `vercel deploy --prod`). Migration `20260531000001_documents_rls.sql` **já aplicada no Supabase** (policies criadas).

**O que entrou:**

- 4 prompts versionados em `lib/ai/prompts/`: `memorial.v1`, `caderno.v1`, `proposta.v1`, `contrato.v1`
- Schema comum em `_shared-document-schema.ts` (titulo + sections)
- Pipeline `lib/ai/generate-document.ts` (Claude Sonnet 4.6 + tool_use + zod)
- Conversor Tiptap em `lib/tiptap/from-sections.ts`
- Server Actions: generate, save, finalize, delete
- Components: TiptapEditor (com toolbar), DocumentPdfExport (com marca d'água RASCUNHO + disclaimer obrigatório), GenerateDocumentMenu (dropdown), DocumentStatusToggle
- Pages: `/projetos/[id]/documentos` (lista) + `/documentos/[documentId]` (editor)
- Build local OK (17 rotas), tsc + eslint + prettier limpos

**Pendências para fechar Sprint 5:**

1. **Rodar DoD test live** — `npx tsx scripts/sprint5-dod-test.ts` faz 4 chamadas reais Claude (~$0.10 total, ~2-4min). Foi cancelado pelo usuário antes de rodar. Re-rodar antes de tag.

2. **Deploy Vercel** — `vercel deploy --prod --token "$VERCEL_TOKEN" --yes`

3. **Smoke test em prod** pelo usuário:
   - Abrir um projeto com extração confirmada
   - Clicar "Documentos por IA" no card "Próximas seções"
   - Gerar memorial → revisar no editor Tiptap → exportar PDF (deve ter marca d'água RASCUNHO se status=rascunho)
   - Marcar como "Finalizado" → exportar PDF de novo (sem marca d'água)
   - Idem para os outros 3 tipos

4. **Tag `sprint-5-done`** + final report

5. **Custo médio esperado:** ~$0.05/doc Sonnet 4.6 → R$ 0,30 por projeto completo com os 4 docs. Bem abaixo do orçado USD 0.20/doc do spec.

---

## 🌐 Credenciais (todas em `.env.local` + Vercel envs)

|                      |                                                                   |
| -------------------- | ----------------------------------------------------------------- |
| App live             | https://memorial-ai-mu.vercel.app                                 |
| GitHub               | https://github.com/marcelozancantrader-bit/Saas                   |
| Supabase (sa-east-1) | https://supabase.com/dashboard/project/fittavwljhbwiljvhqsv       |
| Vercel               | https://vercel.com/marcelozancantrader-4712s-projects/memorial-ai |
| Anthropic Console    | https://console.anthropic.com                                     |
| Inngest dashboard    | https://app.inngest.com                                           |

Service-role + anon + DB URL + Anthropic key + Inngest event/signing key — todos presentes.

---

## 🛠️ Comandos úteis

```bash
cd C:\dev\memorial-ai

# Dev
npm run dev                 # localhost:3000
npm run build
npm run typecheck
npm run lint
npm run format

# Banco
npm run db:push             # aplica migrations (precisa SUPABASE_DB_URL)
npx tsx scripts/confirm-user-email.ts <email>

# Testes DoD
npx tsx scripts/sprint1-dod-test.ts   # RLS clients
npx tsx scripts/sprint2-dod-test.ts   # RLS projects/files/Storage
npx tsx scripts/sprint3-dod-test.ts   # AI extraction (gasta ~$0.02)
npx tsx scripts/sprint4-dod-test.ts   # SINAPI orçamento
npx tsx scripts/sprint5-dod-test.ts   # AI docs (gasta ~$0.10) — AINDA NÃO RODADO

# Deploy
vercel deploy --prod --token "$VERCEL_TOKEN" --yes
vercel logs https://memorial-ai-mu.vercel.app --token "$VERCEL_TOKEN"
```

**VERCEL_TOKEN:** preservado fora do git — consulte `.env.local` ou recupere via https://vercel.com/account/tokens (gera novo se perdido).

---

## 📂 Estrutura do projeto (Sprint 5)

```
lib/ai/
  clients/anthropic.ts                  # Wrapper Anthropic + pricing
  extract-floor-plan.ts                 # Sprint 3
  generate-document.ts                  # Sprint 5
  prompts/
    extract-floor-plan.v1.ts            # Sprint 3
    _shared-document-schema.ts          # Sprint 5
    memorial.v1.ts                      # Sprint 5
    caderno.v1.ts                       # Sprint 5
    proposta.v1.ts                      # Sprint 5
    contrato.v1.ts                      # Sprint 5

lib/tiptap/from-sections.ts             # Conversão AI → Tiptap → flat blocks

server/actions/documents/               # Sprint 5
  generate.action.ts
  save.action.ts
  finalize.action.ts
  delete.action.ts

components/features/documents/          # Sprint 5
  TiptapEditor.tsx                      # Editor com toolbar
  DocumentPdfExport.tsx                 # PDF com marca d'água + disclaimer
  GenerateDocumentMenu.tsx              # Dropdown gerar
  DocumentStatusToggle.tsx              # Rascunho ↔ Finalizado

app/(app)/projetos/[id]/documentos/
  page.tsx                              # Lista de docs do projeto
  [documentId]/page.tsx                 # Editor + export
```

---

## 🎯 Como retomar

1. `cd C:\dev\memorial-ai`
2. Diga uma das opções no Claude Code:
   - **"Rodar DoD Sprint 5 e finalizar"** → roda o teste live, deploya, taggea
   - **"Pular DoD test, só deploy + tag"** → apenas deploy + tag (mais arriscado)
   - **"Tem bug em [X]"** → debug específico
   - **"Go Sprint 6"** → começa F6 Portal do Cliente (deixa Sprint 5 como WIP)

---

## ⚠️ Pendências de housekeeping antigas (não bloqueantes)

- Conectar GitHub no Vercel (Settings → Git) para auto-deploy ao push, em vez do `vercel deploy --prod` manual
- Confirmar Inngest está sincronizado e processFloorPlan funciona end-to-end (já validado no Sprint 3 mas usuário não testou com PDF real ainda)
