# Memorial.ai — Estado da sessão

**Última pausa:** 2026-05-18 (Sprint 6 fechado, auto-deploy via GitHub→Vercel ativo)
**Source-of-truth do produto:** `C:\Users\zanca\OneDrive\Desktop\Saas\` (`CLAUDE.md`, `PROMPT_CLAUDE_CODE.md`, `ANALISE_MERCADO.md`)
**Plano original:** `C:\Users\zanca\.claude\plans\saas-eng-e-arq-tender-curry.md`

---

## ✅ Sprints concluídos (6 de 8)

| Sprint                                                        | Tag             | DoD                                                 | Commit final |
| ------------------------------------------------------------- | --------------- | --------------------------------------------------- | ------------ |
| 1 — Fundação (Next 16 + Supabase + Auth + RLS)                | `sprint-1-done` | 8/8 RLS cross-tenant clients                        | `cc1ea0d`    |
| 2 — F2 Projetos/Clientes (CRUD + ViaCEP + CPF/CNPJ + Storage) | `sprint-2-done` | 8/8 RLS projects/files/Storage                      | `e8cca8e`    |
| 3 — F3 Extração planta IA (Claude Sonnet 4.6 + Inngest)       | `sprint-3-done` | 4/4 schema + live: 92.5m²/7.6s/$0.0198              | `2460113`    |
| 4 — F4 SINAPI + Orçamento (heurístico, sem IA)                | `sprint-4-done` | 9 asserts: 29 itens R$193k/656ms + RLS              | `cb7bc6d`    |
| 5 — F5 Documentos por IA (4 tipos, Sonnet 4.6 + Tiptap + PDF) | `sprint-5-done` | 4/4 docs live: 539s, $0.55, RLS isolada             | `6a937ae`    |
| 6 — F6 Portal do Cliente (DIFERENCIAL)                        | `sprint-6-done` | 21 asserts: token + aprovação + scope cycle + audit | `1282154`    |

**Status do prod:** GitHub→Vercel conectado, auto-deploy a cada push em `main`. Migrations precisam ser aplicadas manualmente no Supabase (db push do CLI requer link/login interativo).

---

## ✅ Sprint 6 — Portal do Cliente PASSED

**DoD live (21 asserts), commit `1282154`:**

- Cliente recebe `portal_token` UUID auto ao ser criado (já existia no schema, agora usado)
- Profissional envia doc → `envio_meta` + `hash_sha256` persistidos; e-mail para cliente (Resend, gated)
- Portal `/portal/[token]` carrega via service-role com validação de token
- Cliente aprova com **assinatura por desenho (canvas vanilla)** + checkbox de termos
- Aprovação registra IP (`x-forwarded-for`), user-agent, timestamp, hash do doc, decisão
- Fluxo scope_change: cliente solicita → profissional define valor/prazo → cliente assina aditivo
- Audit log com 3 entries `client_portal` (document.approved, scope_change.requested, scope_change.approved)
- Bruno (outra org / token desconhecido) → load falha, sem dados vazados

**Entregas (commit `1282154`):**

- Migration `20260607000001`: `documents.envio_meta` + `hash_sha256`, helper `is_portal_client_of_project`, 7 policies scope_changes (4 member + 3 portal) + 2 policies documents portal
- `server/services/portal-loader.ts`: validate token + fetch project state (service-role)
- 5 server actions: `send-to-portal` (escritório), `approve-document`/`approve-scope-change`/`request-scope-change` (portal), `respond-scope-change` (escritório)
- 4 components: `SignatureCanvas` (vanilla pointer events), `ApprovalCard`, `ScopeChangeSection`, `ScopeChangesCard`
- `SendToPortalButton` no editor do documento; copia o link `/portal/<token>` no clipboard
- `lib/email/resend.ts`: HTTP-direto (sem SDK), gated em `RESEND_API_KEY`/`RESEND_FROM_EMAIL`; envio silenciosamente pulado se não configurado

**Pendências de polish (Sprint 6.5 opcional):**

- Auto-gerar documento "Ordem de alteração" PDF quando scope_change vira aprovado
- WhatsApp via Z-API ou similar (spec menciona, V0 só tem e-mail)
- Geolocalização aproximada por IP (V0 só captura IP)
- Portal mostrar HISTÓRICO de docs com link para preview do conteúdo Tiptap (hoje só lista título + status)

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
npx tsx scripts/sprint5-dod-test.ts   # AI docs (gasta ~$0.55, ~9min — 4 chamadas Claude)
npx tsx scripts/sprint6-dod-test.ts   # Portal do Cliente (sem custo, ~5s)

# Deploy
vercel deploy --prod --token "$VERCEL_TOKEN" --yes
vercel logs https://memorial-ai-mu.vercel.app --token "$VERCEL_TOKEN"
```

**VERCEL_TOKEN:** preservado fora do git — consulte `.env.local` ou recupere via https://vercel.com/account/tokens (gera novo se perdido).

---

## 📂 Estrutura do projeto (Sprints 5 + 6)

```
lib/ai/                                   # Sprint 3 + 5
  clients/anthropic.ts
  extract-floor-plan.ts
  generate-document.ts
  prompts/*.v1.ts                         # memorial, caderno, proposta, contrato + _shared schema

lib/email/resend.ts                       # Sprint 6 (HTTP direto, gated em RESEND_API_KEY)
lib/tiptap/from-sections.ts               # Sprint 5

server/services/                          # Sprint 6
  portal-loader.ts                        # validate token + fetch project state via service-role
  current-org.ts                          # Sprint 1

server/actions/documents/                 # Sprint 5 + 6
  generate.action.ts, save.action.ts, finalize.action.ts, delete.action.ts
  send-to-portal.action.ts                # Sprint 6 — registra envio_meta + e-mail Resend
server/actions/portal/                    # Sprint 6 (todas via service-role + token validation)
  approve-document.action.ts
  request-scope-change.action.ts
  approve-scope-change.action.ts
server/actions/scope-changes/             # Sprint 6
  respond.action.ts                       # profissional define valor/prazo

components/features/documents/            # Sprint 5 + 6
  TiptapEditor.tsx, DocumentPdfExport.tsx, GenerateDocumentMenu.tsx, DocumentStatusToggle.tsx
  SendToPortalButton.tsx                  # Sprint 6
components/features/portal/               # Sprint 6
  SignatureCanvas.tsx                     # vanilla canvas + pointer events
  ApprovalCard.tsx, ScopeChangeSection.tsx
components/features/scope-changes/        # Sprint 6
  ScopeChangesCard.tsx                    # exibido no /projetos/[id]

app/portal/[token]/                       # Sprint 6 — rota pública (fora do middleware gate)
  layout.tsx, page.tsx
app/(app)/projetos/[id]/documentos/
  page.tsx, [documentId]/page.tsx         # +SendToPortalButton, +envio_meta/aprovacao_meta
```

---

## 🎯 Como retomar

1. `cd C:\dev\memorial-ai`
2. Diga uma das opções no Claude Code:
   - **"Go Sprint 7"** → F7 Dashboard + F8 Billing (KPIs, notificações, Asaas, plan limits)
   - **"Polish Sprint 6"** → "ordem de alteração" PDF auto, WhatsApp Z-API, geo por IP
   - **"Tem bug em [X]"** → debug específico
   - **"Smoke test portal"** → guia o usuário no fluxo end-to-end manual

---

## ⚠️ Pendências de housekeeping (não bloqueantes)

- **Migration push do CLI bloqueado** — `npx supabase link/db push` precisam de login interativo. Migrations novas precisam ser coladas no Dashboard SQL Editor manualmente (foi o caminho do Sprint 6).
- **Vercel CLI não está no PATH do PowerShell global** — mas auto-deploy via GitHub está conectado, então push em `main` já deploya.
- Confirmar Inngest está sincronizado e processFloorPlan funciona end-to-end (já validado no Sprint 3 mas usuário não testou com PDF real ainda)
- Resend não configurado (`RESEND_API_KEY` + `RESEND_FROM_EMAIL`) — sem isso o portal envia link via clipboard, sem e-mail.
