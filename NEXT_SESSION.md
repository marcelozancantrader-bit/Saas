# Memorial.ai — Estado da sessão

**Última pausa:** 2026-05-18 (Sprint 5 DoD OK + tag pushado; só falta deploy Vercel manual)
**Source-of-truth do produto:** `C:\Users\zanca\OneDrive\Desktop\Saas\` (`CLAUDE.md`, `PROMPT_CLAUDE_CODE.md`, `ANALISE_MERCADO.md`)
**Plano original:** `C:\Users\zanca\.claude\plans\saas-eng-e-arq-tender-curry.md`

---

## ✅ Sprints concluídos (5 de 8)

| Sprint                                                        | Tag             | DoD                                     | Commit final        |
| ------------------------------------------------------------- | --------------- | --------------------------------------- | ------------------- |
| 1 — Fundação (Next 16 + Supabase + Auth + RLS)                | `sprint-1-done` | 8/8 RLS cross-tenant clients            | `cc1ea0d`/`8176c49` |
| 2 — F2 Projetos/Clientes (CRUD + ViaCEP + CPF/CNPJ + Storage) | `sprint-2-done` | 8/8 RLS projects/files/Storage          | `e8cca8e`           |
| 3 — F3 Extração planta IA (Claude Sonnet 4.6 + Inngest)       | `sprint-3-done` | 4/4 schema + live: 92.5m²/7.6s/$0.0198  | `2460113`           |
| 4 — F4 SINAPI + Orçamento (heurístico, sem IA)                | `sprint-4-done` | 9 asserts: 29 itens R$193k/656ms + RLS  | `cb7bc6d`           |
| 5 — F5 Documentos por IA (4 tipos, Sonnet 4.6 + Tiptap + PDF) | `sprint-5-done` | 4/4 docs live: 539s, $0.55, RLS isolada | `6a937ae`           |

**Últimos commits úteis:**

- `9825c89` — Sprint 5 WIP inicial (código completo)
- `6a937ae` — **Sprint 5 robustez** (streaming, max_tokens 16K, timeouts 290s, schema bumps)

---

## ✅ Sprint 5 — DoD live PASSED

**DoD live (sonnet-4-6), commit `6a937ae`:**

| Tipo      | Latência | Seções | Custo     |
| --------- | -------- | ------ | --------- |
| memorial  | 114s     | 11     | $0.11     |
| caderno   | 233s     | 14     | $0.23     |
| proposta  | 60s      | 8      | $0.06     |
| contrato  | 133s     | 13     | $0.14     |
| **Total** | **539s** | **46** | **$0.55** |

- RLS: Bruno (outra org) vê 0 documentos do projeto da Camila ✅
- 4/4 tipos persistidos, prompt_versão registrada ✅
- Custo real: ~$0.55/projeto completo. Caderno é o gargalo (denso, 14 seções, $0.23). Acima do orçado USD 0.20/doc, mas ainda viável (R$2,75/projeto a USD≈R$5)

**Fixes em `6a937ae` para fechar DoD (mudanças vs Sprint 5 WIP):**

- `client.messages.stream` em vez de `.create` (HTTP keep-alive em geração de 100-230s)
- `max_tokens` 8192 → 16384 (caderno truncava JSON antes)
- `observacoes_internas` max 1000 → 4000 chars (Claude excede facilmente)
- `bullet/ordered_list` items max 500 → 2000 chars (cláusulas contratuais longas)
- `timeoutMs` default 90s → 290s; test 120s → 290s
- `maxDuration = 300` nas pages `/projetos/[id]/documentos[/:id]` (Vercel)
- Erros: status `undefined` agora reporta "erro de transporte"; stop_reason=max_tokens vira mensagem explícita

---

## ⏳ Pendência única: deploy Vercel

**`vercel deploy --prod` ainda não rodou** — `vercel` CLI não está no PATH do PowerShell global, OAuth login não rodou. Tag `sprint-5-done` aponta para `6a937ae` (já pushado pra `origin`), código está em GitHub, mas https://memorial-ai-mu.vercel.app ainda está no commit `9825c89` (WIP, sem os fixes).

**Para deploy:**

```powershell
cd C:\dev\memorial-ai
npm i -g vercel          # ou: npx vercel deploy --prod --yes
vercel login             # 1ª vez, abre browser OAuth
vercel deploy --prod --yes
```

Alternativa robusta: conectar GitHub no Vercel (Settings → Git → Connect Repository) — daí cada `git push origin main` auto-deploya. Recomendado antes do Sprint 6.

**Smoke test pós-deploy** (5min):

- Login → abrir projeto com extração confirmada
- "Documentos por IA" → gerar memorial (espera 2min)
- Editor Tiptap → exportar PDF (com marca d'água RASCUNHO)
- Toggle "Finalizado" → exportar PDF (sem marca d'água)
- Repetir para caderno (5min!), proposta, contrato

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
   - **"Deploy Sprint 5 agora"** → orienta install do vercel CLI + login + deploy + smoke
   - **"Conectar GitHub no Vercel"** → setup auto-deploy (resolve a pendência principal de housekeeping)
   - **"Tem bug em [X]"** → debug específico
   - **"Go Sprint 6"** → começa F6 Portal do Cliente (Sprint 5 já taggeada e DoD OK; só prod fica desatualizado até deploy manual)

---

## ⚠️ Pendências de housekeeping (não bloqueantes)

- **Vercel CLI não está no PATH do PowerShell global** — usar `npx vercel` ou `npm i -g vercel`
- Conectar GitHub no Vercel (Settings → Git) para auto-deploy ao push, em vez do `vercel deploy --prod` manual
- Confirmar Inngest está sincronizado e processFloorPlan funciona end-to-end (já validado no Sprint 3 mas usuário não testou com PDF real ainda)
