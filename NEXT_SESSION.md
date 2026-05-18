# Memorial.ai — Estado da sessão

**Última pausa:** 2026-05-18 · **Após:** Sprint 3 fechado e validado em prod. Pendências de housekeeping resolvidas. Pronto para Sprint 4.
**Source-of-truth do produto:** `C:\Users\zanca\OneDrive\Desktop\Saas\` (`CLAUDE.md`, `PROMPT_CLAUDE_CODE.md`, `ANALISE_MERCADO.md`)
**Plano original:** `C:\Users\zanca\.claude\plans\saas-eng-e-arq-tender-curry.md`

---

## ✅ Sprints concluídos (3 de 8)

| Sprint                                                                 | Tag             | DoD                                            | Commit              |
| ---------------------------------------------------------------------- | --------------- | ---------------------------------------------- | ------------------- |
| 1 — Fundação (Next 16 + Supabase + Auth + RLS)                         | `sprint-1-done` | 8/8 (RLS cross-tenant)                         | `cc1ea0d`/`8176c49` |
| 2 — F2 Projetos e Clientes (CRUD + ViaCEP + CPF/CNPJ + upload Storage) | `sprint-2-done` | 8/8 (projects + files + Storage RLS)           | `e8cca8e`           |
| 3 — F3 Extração de planta por IA (Claude Sonnet 4.6 + Inngest)         | `sprint-3-done` | 4/4 offline + live: 92.5m² em 7.6s por $0.0198 | `2460113`           |

**Último commit:** `12d26c6` — fix do redirect em Server Actions (evita erro "This page couldn't load" do Edge ao criar cliente/projeto).

---

## 🌐 URLs e credenciais

| O quê                | Onde                                                              |
| -------------------- | ----------------------------------------------------------------- |
| App live             | https://memorial-ai-mu.vercel.app                                 |
| GitHub               | https://github.com/marcelozancantrader-bit/Saas                   |
| Supabase (sa-east-1) | https://supabase.com/dashboard/project/fittavwljhbwiljvhqsv       |
| Vercel               | https://vercel.com/marcelozancantrader-4712s-projects/memorial-ai |
| Anthropic Console    | https://console.anthropic.com                                     |
| Inngest dashboard    | https://app.inngest.com                                           |

**Credenciais ativas (todas em `.env.local` + Vercel envs):**

- Supabase URL, anon, service_role, DB URL ✅
- Anthropic API key ✅ (créditos adicionados pelo usuário)
- Inngest Event Key + Signing Key ✅
- Inngest app sincronizado em prod ✅ (PUT /api/inngest → 200)

**Usuário de teste já criado:**

- Email: `marcelozancantrader@gmail.com`
- Email confirmado manualmente via `scripts/confirm-user-email.ts`
- Org: "Teste" (owner)

---

## ✅ Pendências resolvidas no fim da última sessão

1. **Fix do redirect (`12d26c6`)** — usuário validou criação de cliente/projeto em prod. Sem mais "This page couldn't load" do Edge.
2. **"Confirm email" no Supabase Auth** — usuário desligou no painel. Signups novos podem logar direto.
3. **Sprint 3 — smoke test end-to-end com PDF real** — fica como teste opcional que o usuário pode rodar a qualquer momento; o pipeline já passou no DoD live com PDF sintético ($0.0198 em 7.6s).

### Pendência opcional ainda em aberto

**Conectar GitHub no Vercel** (para auto-deploy ao push):
→ Vercel dashboard → memorial-ai → Settings → Git → Connect GitHub Account.

Hoje deploys são manuais via `vercel deploy --prod --token "$VERCEL_TOKEN" --yes`.

---

## 🚀 Próximo passo: Sprint 4 — F4 SINAPI + Orçamento

Aguardando aprovação explícita do usuário. Escopo do master prompt (semana 7):

- Job mensal (1º dia útil) baixa SINAPI da Caixa → parseia XLSX → popula `sinapi_compositions`
- Suporte versão **desonerada** e **não-desonerada** por UF
- Regras heurísticas em `/lib/budget/rules/v1.ts` (não-IA — gera orçamento a partir de `projects.meta.extracao_planta`):
  - `área_alvenaria = (perimetro_externo × pé_direito) + (área_interna × fator_paredes_internas)`
  - etc.
- Tela do orçamento: edição inline, busca SINAPI, ajuste de BDI
- Curva ABC (recharts)
- Export Excel (sheetjs) + PDF (@react-pdf/renderer)
- **Critério:** orçamento de casa 120m² gera em <10s, erro <20% vs orçamento manual

**Sprint 5–8 depois:** F5 docs IA → F6 portal cliente (DIFERENCIAL) → F7 dashboard + F8 billing Asaas → Polish + Beta.

---

## 🛠️ Comandos úteis

```bash
cd C:\dev\memorial-ai

# Desenvolvimento
npm run dev                 # localhost:3000
npm run build               # production build local
npm run typecheck
npm run lint
npm run format

# Banco
npm run db:push             # aplica migrations novas
# (CLI: npx supabase db query --db-url "..." "select ...")

# Testes DoD
npx tsx scripts/sprint1-dod-test.ts   # RLS cross-tenant clients
npx tsx scripts/sprint2-dod-test.ts   # RLS projects + files + Storage
npx tsx scripts/sprint3-dod-test.ts   # AI extraction (schema + live se ANTHROPIC_API_KEY)

# Admin
npx tsx scripts/confirm-user-email.ts <email>   # confirma email manualmente

# Deploy
vercel deploy --prod --token "$VERCEL_TOKEN" --yes
vercel env ls --token "$VERCEL_TOKEN"

# Logs prod
vercel logs https://memorial-ai-mu.vercel.app --token "$VERCEL_TOKEN"
```

---

## 📂 Estrutura do projeto (resumo)

```
app/(auth)/{login,signup}            # Rotas públicas
app/(app)/{clientes,projetos,...}    # Rotas autenticadas (gated em proxy.ts)
app/api/inngest                      # Inngest serve handler (PUT 200 = sincronizado)
app/auth/callback                    # OAuth callback

lib/supabase/{server,client,middleware,admin}.ts
lib/ai/{clients,prompts}/            # Sonnet 4.6 + prompts versionados
lib/ai/extract-floor-plan.ts         # Função pura — testável
lib/inngest/client.ts                # Inngest v4 client
lib/validators/                      # zod schemas (env, auth, clients, projects, cpf-cnpj)
lib/utils/{viacep,brazilian-formatters,safe-redirect}.ts

components/ui/                       # shadcn primitives (Base UI variant)
components/features/{auth,shell,clients,projects,files,extraction,address}/

server/actions/                      # Server Actions ('use server')
server/jobs/process-floor-plan.ts    # Inngest function
server/services/current-org.ts       # getCurrentOrg() helper

supabase/migrations/                 # 5 SQLs aplicados em prod (4 do Sprint 1, +1 do Sprint 2)
docs/decisions/                      # 4 ADRs
scripts/                             # 4 utilitários: 3 DoD tests + confirm-user-email
```

---

## 🎯 Para retomar a sessão

Abre Claude Code em `C:\dev\memorial-ai\` e diz uma das opções:

- **"Retomar — leia NEXT_SESSION.md"** → carrega contexto completo
- **"Tentei criar cliente/projeto, [erro X]"** → continua o debug do fix do redirect
- **"Go Sprint 4"** → começa F4 SINAPI + Orçamento

O `CLAUDE.md` deste repo referencia os docs em `OneDrive\Desktop\Saas\` automaticamente.
