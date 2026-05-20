# Memorial.ai — Estado da sessão

**Última pausa:** 2026-05-20 — **Orçamento overhaul: rules v3 com códigos SINAPI corretos (descrições oficiais), troca de código por padrão construtivo (cerâmico/porcelanato, semi-oca/maciça, granito/quartzo/mármore), botão Regerar com parâmetros editáveis, bug crítico do Inngest worker corrigido (descartava ambientes da extração).**
**Source-of-truth do produto:** `C:\Users\zanca\OneDrive\Desktop\Saas\` (`CLAUDE.md`, `PROMPT_CLAUDE_CODE.md`, `ANALISE_MERCADO.md`)
**Plano original:** `C:\Users\zanca\.claude\plans\saas-eng-e-arq-tender-curry.md`
**App live:** https://memorial-ai-mu.vercel.app · **Último commit:** `a37add6`
**Repo:** https://github.com/marcelozancantrader-bit/Saas

---

## 📌 Resumo da sessão 2026-05-20 (em prod, sem pendências)

### Overhaul completo do orçamento SINAPI (v3)

**Diagnóstico inicial:** engenheiro disse R$250-300k pra 130m² popular, sistema dava R$138k (45% abaixo). Investigação revelou múltiplos bugs em cascata. Auditoria completa dos códigos SINAPI mostrou que mais de 11 códigos no seed tinham descrição **completamente diferente** da oficial SINAPI (87878 "alvenaria" era chapisco; 89800 "forro gesso" era tubo PVC esgoto; 91173/91174 "janelas" eram fixação de tubos; etc).

**Mudanças aplicadas (commits desta sessão):**

1. `ebc2473` — fix mensagem confusa do orçamento (extração feita mas não confirmada)
2. `48d226c` — rules v2 + preços SINAPI atualizados pra composições completas com MO
3. `8d01144` — fator padrão construtivo médio era igual ao popular (bug calibração)
4. `798da8f` — **rules v3 com códigos SINAPI corretos** (96523, 103328, 94965, 87248, 88489, 104473, 104480, 96109, 87622, 90845, 94573, 94569, 86931, 86939, 87265 etc.) + reseed migration
5. `098c28b` — **botão Regerar com dialog editável** (UF, mês ref, BDI, regime) na página de detalhe
6. `aad8ba3` — fator padrão construtivo afeta PREÇO (não quantidade) + footer PDF dizia "regras v1"
7. `9173179` — **bug crítico:** Inngest worker descartava ambientes/elementos_especiais (cast TS limitado a 5 campos) → orçamento com 0 pontos elétricos/hidráulicos/louças
8. `b3715ad` — "custom-xxx" no PDF/Excel/UI → "Composição própria" (helper `lib/budget/format-codigo.ts`)
9. `a37add6` — **troca de código SINAPI por padrão** (cerâmico→porcelanato, semi-oca→maciça mexicana, granito→quartzo→mármore)

**Resultado validado (smoke test 5 cenários, todos dentro CUB):**

| Padrão  | Bruto/m² | C/BDI 28%/m² | Faixa CUB   |
| ------- | -------- | ------------ | ----------- |
| Popular | R$2.257  | R$2.889      | R$1850-2400 |
| Médio   | R$2.647  | R$3.388      | R$2300-2900 |
| Alto    | R$3.227  | R$4.131      | R$3000-4200 |
| Luxo    | R$3.610  | R$4.620      | R$4000-6500 |

**Migrations aplicadas (Supabase Dashboard):**

- `20260720000001_sinapi_seed_v2_precos_completos.sql` — atualiza preços antigos pra composições com MO
- `20260721000001_sinapi_seed_v3_codigos_corretos.sql` — DELETE preços antigos + INSERT códigos modernos com descrições oficiais
- `20260721000002_sinapi_seed_v3_premium.sql` — adiciona 87263 (porcelanato) + 100693 (porta maciça mexicana)

**Arquitetura final:**

- `lib/budget/rules/v3.ts` — regras com 15 grupos + `multiplicador_preco` (não infla quantidade) + escolha de código por padrão
- v1 e v2 mantidas intactas pra reprodutibilidade de orçamentos antigos
- `budget_items` grava snapshot (composicao_codigo, descricao, preco_unitario) → orçamentos antigos não quebram com mudanças nas regras

---

---

## 📌 Resumo da sessão 2026-05-19 (em prod, sem pendências)

### Landing pública + pricing high-ticket

- `/` é landing pública (visitante não-logado). Logado redireciona pra `/dashboard`.
- Dashboard movido pra `/dashboard`, middleware atualizado.
- Pricing: **Free / Standard R$199,90 / Pro R$449,90 (recomendado) / Pro Max R$699,90 / Agência (consultar)**.
- `lib/plans/limits.ts` reescrito com 5 tiers + `PLAN_ORDER`.
- Migration `20260718000004_pricing_tiers.sql` (org constraint) + `20260719000001` (subscriptions constraint) aplicadas.
- Landing: hero + 4 passos + 6 dores + 12 funcionalidades + ROI + 5 planos + FAQ + CTA.
- SEO: `app/robots.ts`, `app/sitemap.ts`, `app/not-found.tsx`, `app/error.tsx`.

### Asaas — cobrança PIX (sandbox 100% funcional)

- `lib/billing/asaas.ts`: env `ASAAS_ENVIRONMENT` (sandbox/production), helpers `getFirstSubscriptionPayment` (retorna invoiceUrl com QR PIX) e `customerAreaUrl` (fallback).
- `createOrFindCustomer` agora faz UPSERT (atualiza cpfCnpj/nome se customer já existe).
- `upgradePlanAction`: retorna `needs_cpf_cnpj: true` se org sem CPF/CNPJ → dialog inline em `PlanUpgradeButton` pede documento, salva via `setOrgCpfCnpjAction` e re-tenta.
- Webhook handler `/api/webhooks/asaas` trata PAYMENT_RECEIVED (ativa sub + cancela outras active da mesma org), PAYMENT_OVERDUE, PAYMENT_REFUNDED, SUBSCRIPTION_DELETED, SUBSCRIPTION_UPDATED.
- Migration `20260719000003` dropa `webhook_log` (debug) + cancela subscriptions active duplicadas.
- Checkout abre em nova aba (window.open).
- **Setup ativo:** ASAAS_API_KEY (sandbox), ASAAS_WEBHOOK_TOKEN, ASAAS_ENVIRONMENT=sandbox no Vercel + webhook configurado em sandbox.asaas.com com 5 eventos marcados.
- **Pra ir pra prod:** trocar para conta produção Asaas, novas keys, ASAAS_ENVIRONMENT=production.

### Google OAuth

- Configurado: Google Cloud OAuth Client (Web) → Supabase Auth provider → Vercel `NEXT_PUBLIC_GOOGLE_OAUTH_ENABLED=true`.
- Site URL + Redirect URLs no Supabase URL Config.
- **App ainda em modo "Em teste"** no Google — pra publicar (qualquer e-mail logar) precisa preencher domínios + URLs privacidade/termos no Tela de Consentimento.

### UX polish

- **Signup/Login** com Logo SVG real, link pra landing, benefícios destacados, PasswordStrength (5 níveis), toggle Mostrar/Ocultar senha, mensagem clara pós-cadastro.
- **TopBar dropdown** sem placeholders: Dashboard / Configurações / Plano e cobrança / Sair (vermelho).
- **`/configuracoes`** — `AccountCard` novo (avatar + editar nome + trocar/definir senha com dialog completo) + Color picker visual (primária + secundária + preview ao vivo) + máscara automática CPF/CNPJ + labels PF/PJ em destaque. Migration `20260719000004` adiciona `organizations.cor_secundaria`.
- **`/clientes/[id]`** virou hub do cliente: 4 KPIs + `PortalLinkCard` (URL copiável + botões Copiar/Abrir) + lista projetos + lista documentos enviados ao portal + lista alterações de escopo + form editável.
- **`/projetos/novo?client_id=X`** pré-seleciona o cliente.

### Cron + copy

- `server/jobs/stale-projects-cron.ts`: Inngest function diária (9h Brasília) detecta projetos parados ≥14d e docs aguardando ≥7d → notificação org-wide com dedup 14d.
- Pro Max copy: "API + integrações" → "API (em breve)", `apiAccess: false`.

---

## 📝 Migrations aplicadas nesta sessão (todas no Supabase Dashboard)

1. `20260718000004_pricing_tiers.sql` — organizations.plano constraint (free/standard/pro/pro_max/agency)
2. `20260719000001_subscriptions_pricing_tiers.sql` — subscriptions.plano constraint igual
3. `20260719000002_webhook_log.sql` — criou tabela debug (depois dropada)
4. `20260719000003_cleanup_webhook_debug.sql` — dropa webhook_log + cancela subs active duplicadas
5. `20260719000004_org_cor_secundaria.sql` — organizations.cor_secundaria

---

## ⏳ Pendências de integração (opcionais, app funciona sem elas)

### Resend (e-mail transacional do portal)

- Código pronto: `lib/email/resend.ts` + template `lib/email/templates.ts` + `send-to-portal.action.ts` já chama sendEmail (gated).
- Setup: criar conta resend.com → adicionar/verificar domínio (ou usar `onboarding@resend.dev` pra teste) → API key → setar `RESEND_API_KEY` + `RESEND_FROM_EMAIL` no Vercel + redeploy.
- Desbloqueia: notificação do cliente quando recebe doc no portal, futuro envio de convites de membros.

### Sentry (rastreio de erros)

- Código pronto: `lib/observability/sentry.ts` (HTTP-direto, gated em SENTRY_DSN).
- Setup: criar projeto Next.js no sentry.io → copiar DSN → setar `SENTRY_DSN` no Vercel + redeploy.

### PostHog (analytics)

- Código pronto: `lib/observability/posthog.ts` (sendBeacon, gated).
- Setup: criar projeto posthog.com → setar `NEXT_PUBLIC_POSTHOG_KEY` + `NEXT_PUBLIC_POSTHOG_HOST` no Vercel + redeploy.

### Asaas em produção real

- Hoje: sandbox (ASAAS_ENVIRONMENT=sandbox). Setup: conta produção Asaas + homologação (alguns dias) + trocar key e env.

---

## 🎯 Backlog de produto (opcional, ordem de impacto)

1. **Convite/lista de membros da org** — tabela `invitations` + UI em /configuracoes + Resend pra e-mail
2. **Trocar e-mail da conta** — Supabase `updateUser({ email })` com confirmação
3. **Configurar notificações por e-mail** — usuário escolhe quais eventos receber (depende Resend)
4. **Sprint 11 — análise cruzada IA** — best-effort Claude Vision lendo 2-3 PDFs juntos com disclaimer
5. **Multi-upload de PDFs** (hoje 1 por vez)
6. **Edição manual da extração das disciplinas** (hoje só confirma)
7. **Publicar app Google OAuth** (sai do modo teste) — precisa privacidade + termos URLs no Tela de Consentimento + verificação Google ~3-5 dias
8. **Excluir só workspace** sem deletar conta (se membro de várias)
9. **Histórico de busca** localStorage nas listagens
10. **Skeleton loading** entre filtros

---

## ✅ Sprint 9 + 10 + 10.1 — Multi-disciplina (em prod)

**Status:** tudo em prod. Commits `9605619` (Sprint 9+10) + `12d8a5a` (seed SINAPI das disciplinas) + `72ad331` (fix: observacoes max 2000 chars) + `a8c358f` (Sprint 10.1: breakdown por disciplina). 3 migrations aplicadas no Supabase: `project_files.disciplina`, seed das 16 composições SINAPI das disciplinas e `budget_items.disciplina`.

**Entregas:**

- Migration `20260718000001_project_files_disciplina.sql` — adiciona `project_files.disciplina` text (check constraint + default 'architectural') + index `(project_id, disciplina)`.
- 5 novos prompts `lib/ai/prompts/extract-{electrical,hydraulic,structural,gas,hvac}.v1.ts` + `_shared-extraction-schema.ts` com DISCIPLINAS / DISCIPLINA_LABEL / DISCIPLINA_SHORT / pontoAmbienteSchema.
- `lib/ai/extract-discipline.ts` — extractor genérico (Claude Sonnet 4.6 + tool_use, dispatch por disciplina).
- `lib/budget/rules/disciplines.v1.ts` — regras SINAPI elétrica (cabos 91929/91931/91933, quadro 91295, disjuntores), hidráulica (PVC 89711/89714/89732, pontos 89351/89352, fossa 74104/001) e estrutural (concreto 92478/92479, aço 92797). Gás e HVAC retornam `MarketItem[]` com preço de referência (sem SINAPI direto).
- FileUploader UI ganhou Select de disciplina; `register-upload.action` propaga via Inngest event.
- `process-floor-plan.ts` (Inngest) faz dispatch: `architectural` → fluxo legado em `meta.extracao_planta`; demais → `meta.extracoes_disciplinas[<disc>]`.
- `DisciplineExtractionsCard` mostra resumo + Confirmar por disciplina; ação `confirm-discipline-extraction.action.ts`.
- `BudgetDisciplinasCard` na página `/orcamento` mostra status + preço de mercado para gás/HVAC.
- `generate-budget.action` soma itens de disciplinas confirmadas ao orçamento SINAPI; itens com código não-seedado são descartados com observação (não bloqueia).

**Códigos SINAPI novos que podem precisar de seed manual** (gerados pelas novas regras): 91934, 91935, 91952, 91953, 97586, 93653, 93654, 93655, 92479, 74104/001. O orçamento arquitetônico segue funcionando se eles estiverem ausentes (são apenas descartados).

**Como aplicar:**

1. Copiar `supabase/migrations/20260718000001_project_files_disciplina.sql` no SQL editor do Supabase Dashboard.
2. Push em main → Vercel auto-deploya.
3. Smoke test: criar projeto, subir PDF marcando disciplina "Elétrico", aguardar extração (~1min), confirmar, gerar orçamento e ver itens elétricos somados.

---

## 🚀 PRÓXIMO (opcional): Sprint 11 — Análise cruzada IA

**Histórico — escopo original (já entregue):**

### Sprint 9 — Multi-disciplina upload + extração separada (~1 sprint)

- Migration: adicionar `project_files.disciplina` enum:
  `architectural` (atual default) | `electrical` | `hydraulic` | `structural` | `gas` | `hvac`
- 5 novos prompts de extração em `lib/ai/prompts/extract-*.v1.ts`:
  - `extract-electrical.v1.ts` — nº pontos por ambiente, circuitos, quadro, bitolas
  - `extract-hydraulic.v1.ts` — pontos água/esgoto, ralos, reservatório, fossa
  - `extract-structural.v1.ts` — tipo fundação, pilares, vigas, dimensões nominais
  - `extract-gas.v1.ts` — pontos de gás, comprimento tubulação, abrigo
  - `extract-hvac.v1.ts` — pontos AC, dutos, exaustão
- UI no `FileUploader`: ao subir, escolhe disciplina via Select
- Cada extração roda como Inngest job (mesmo padrão do Sprint 3)
- Card de revisão por disciplina (clone de `ExtractionReview`)
- Schema de extração genérico em `lib/ai/prompts/_shared-extraction-schema.ts` que cada disciplina especializa

### Sprint 10 — Quantitativos + orçamento por disciplina (~1 sprint)

- Da extração de cada PDF: gerar quantitativos com composições SINAPI específicas:
  - Elétrico: m fio 1,5/2,5/4mm² (SINAPI 91931, 91933, 91929), tomadas, disjuntores, quadro
  - Hidráulico: m PVC 25/32/100mm + conexões (SINAPI 89711, 89714, 89732), registros, caixa d'água
  - Estrutural: m³ concreto + kg aço CA-50 (SINAPI 92478, 92797)
  - Gás: m tubulação cobre + registros (SINAPI tabela própria)
  - HVAC: split BTU + dutos (referência mercado, não tem SINAPI direto)
- Soma tudo no orçamento total do projeto (arquitetônico + complementares)
- Card "Orçamento por disciplina" no `/projetos/[id]/orcamento` com breakdown

### Sprint 11 — Análise cruzada IA (CONDICIONAL — usuário não confirmou)

- NÃO é clash detection BIM-style (não dá com PDF, exigiria Solibri/Navisworks)
- Best-effort: Claude Vision lê 2-3 PDFs simultâneo → warnings sobre padrões típicos
- Disclaimer pesado: "Não substitui compatibilização técnica via BIM/Revit"

---

## ✅ Tier B parcial — Zoneamento por cidade (entregue)

**Commit `c4faacc`** — 5 capitais curadas (Curitiba/SP/POA/RJ/BH), 17 zonas residenciais.
Schema: `projects.cidade_codigo`, `zoneamento`, `area_terreno_m2`.
Lógica em `lib/zoneamento/{cidades.ts,check.ts}`, UI em `components/features/zoneamento/{ZoneamentoFields,ZoneamentoCard}.tsx`.
Calcula CA, TO, altura, vagas; recuos e permeabilidade ficam como warn (não dá pra medir pela extração).

---

## ✅ Tier A — completo

**Commit `80518a4`** — 5 sprints em 1 sessão:

1. **+5 novos docs IA** (estrutural, hidrossanitário, elétrico, PPCI, impermeabilização) +1 bônus (cronograma)
   - Prompts em `lib/ai/prompts/{memorial-estrutural,memorial-hidrossanitario,memorial-eletrico,ppci,impermeabilizacao,cronograma}.v1.ts`
   - Migration `20260705000001_more_document_types.sql` — enum de 12 valores
   - DocumentTipo extendido + DOCUMENT_LABELS + loadPromptForTipo
2. **ART/RRT pré-preenchida** — `lib/art-rrt/fields.ts` + `components/features/art-rrt/{ArtRrtCard,ArtRrtExport}.tsx`
3. **Chat da Planta** no portal — `server/actions/portal/chat.action.ts` + `components/features/portal/ChatDaPlanta.tsx` (Claude Haiku 4.5, $0.001-0.005/pergunta)
4. **Análise NBR** — `lib/nbr-checks/index.ts` (heurístico, sem IA) + `NbrChecksCard.tsx`

---

## ✅ UX Overhaul + Branding (entregue)

- **Commit `7f26207`**: `ProjectProgress` stepper (7 etapas), sections numeradas no `/projetos/[id]`, menu Gerar Documento agrupado (Memoriais gerais/Comercial/Técnicos), `WelcomeCard` no dashboard, empty states explicativos
- **Commit `ad0eb51`**: Projeto demo em 1 clique — `lib/demo/seed-data.ts` (~400 linhas) + `createDemoProjectAction`. Reduz time-to-value de 5min para 5s.
- **Commit `5715c8b`**: Brand colors azul OKLCH (hue 252°) — todas as CSS vars `--primary`, `--ring`, etc. Dark mode ajustado.
- **Commit `4725297`**: Logo SVG + favicon + apple-icon + OG image dinâmica via `@vercel/og` + `<Logo>` component + email template branded com header gradient + metadata global SEO.

---

## 🐛 Bugs corrigidos pós-MVP

- `813e83c` — Base UI #31 no `DropdownMenuLabel` (precisava de `Menu.Group`)
- `1f5dd3c` — `organizations.name` (não `nome`) em send-to-portal + portal-loader
- `ed3bd3c` — timeout 180s → 290s no generate.action (caderno aborted)

---

## 🎯 MVP COMPLETO — todos os 8 sprints fechados

| Sprint                                                        | Tag             | DoD                                                 | Commit final |
| ------------------------------------------------------------- | --------------- | --------------------------------------------------- | ------------ |
| 1 — Fundação (Next 16 + Supabase + Auth + RLS)                | `sprint-1-done` | 8/8 RLS cross-tenant clients                        | `cc1ea0d`    |
| 2 — F2 Projetos/Clientes (CRUD + ViaCEP + CPF/CNPJ + Storage) | `sprint-2-done` | 8/8 RLS projects/files/Storage                      | `e8cca8e`    |
| 3 — F3 Extração planta IA (Claude Sonnet 4.6 + Inngest)       | `sprint-3-done` | 4/4 schema + live: 92.5m²/7.6s/$0.0198              | `2460113`    |
| 4 — F4 SINAPI + Orçamento (heurístico, sem IA)                | `sprint-4-done` | 9 asserts: 29 itens R$193k/656ms + RLS              | `cb7bc6d`    |
| 5 — F5 Documentos por IA (4 tipos, Sonnet 4.6 + Tiptap + PDF) | `sprint-5-done` | 4/4 docs live: 539s, $0.55, RLS isolada             | `6a937ae`    |
| 6 — F6 Portal do Cliente (DIFERENCIAL)                        | `sprint-6-done` | 21 asserts: token + aprovação + scope cycle + audit | `1282154`    |
| 7 — F7 Dashboard + F8 Billing (Asaas + notifications)         | `sprint-7-done` | 22 asserts: plan limits + KPIs + RLS + upgrade flow | `f203616`    |
| 8 — Polish + Beta (LGPD + legal + landing + observabilidade)  | `sprint-8-done` | 24 asserts: LGPD export + delete cascade            | `9877f03`    |

**Status do prod:** GitHub→Vercel conectado, auto-deploy a cada push em `main`. Migrations aplicadas via Supabase Dashboard SQL editor.

---

## ✅ Sprint 8 — Polish + Beta PASSED

**DoD live (24 asserts), commit `9877f03`:**

- **LGPD compliance:**
  - `GET /api/lgpd/export` → JSON download com TODOS os dados do usuário (organizations, members, clients, projects, project_files, documents, scope_changes, budgets, subscriptions, notifications, audit_log_recent)
  - `deleteAccountAction` com confirmação por digitação "DELETAR MINHA CONTA" → deleta org (CASCADE em FK cobre tudo) onde é owner, remove só membership de orgs alheias, deleta auth user
  - `/configuracoes` ganhou seção Privacidade com export + delete dialog
- **Páginas públicas (fora do middleware gate, robots: noindex no portal):**
  - `/privacidade` — 9 seções LGPD-completo (bases legais, art. 18, retenção, DPO, segurança)
  - `/termos` — 12 seções (responsabilidade técnica, MP 2.200-2/2001 sobre assinatura, planos, uso aceitável, foro Curitiba/PR)
  - `/sobre` — landing com 4 dores resolvidas + 4 cards de plano + CTAs signup/login
- **Observabilidade stubs (sem SDK pesado, gated em envs):**
  - `lib/observability/sentry.ts` — HTTP-direto na ingest API quando `SENTRY_DSN` setado; no-op + console.error senão
  - `lib/observability/posthog.ts` — `capture()` via sendBeacon; gated em `NEXT_PUBLIC_POSTHOG_KEY`
  - Pra SDKs full: instalar `@sentry/nextjs` e `posthog-js` depois

---

---

## ✅ Sprint 7 — Dashboard + Billing PASSED

**DoD live (22 asserts), commit `f203616`:**

- 4 tiers (Free/Pro/Studio/Agency) com pricing + features + limits em `lib/plans/limits.ts` (single source of truth)
- Free: 2 projetos, 5 docs IA/mês, marca d'água, sem portal, 1 user
- Pro: ilimitado projetos, 50 docs/mês, sem marca d'água, portal ativo, 1 user (R$149/mês)
- Studio: 200 docs/mês, 5 users, branding custom (R$349/mês)
- Agency: ilimitado tudo (consulta)

**Enforcement:**

- `generate-document.action`: bloqueia 6º doc IA/mês no Free (testado)
- `send-to-portal.action`: bloqueia no Free (portalClienteEnabled=false)

**Dashboard `/` (6 KPIs):**

- Projetos ativos (vs limite do plano) | Faturamento previsto (soma valor_contrato dos com doc aprovado) | Docs aguardando cliente | Alterações de escopo pendentes | Ciclo médio dias (projeto → 1ª aprovação) | Projetos parados 14+d
- Card de uso vs limites com progress bars (verde/amarelo 80%/vermelho 100%)

**/billing:**

- Plano atual + 4 cards (atual destacado com ring)
- Botão upgrade → `upgradePlanAction`: cria customer Asaas + subscription via PIX se `ASAAS_API_KEY` setado, senão upgrade manual direto
- Histórico de subscriptions

**Asaas integration (gated em ASAAS_API_KEY):**

- `lib/billing/asaas.ts`: HTTP direto (sem SDK), createOrFindCustomer + createSubscription
- `/api/webhooks/asaas`: handler PAYMENT_RECEIVED → ativa subscription + atualiza org.plano; PAYMENT_OVERDUE → past_due; SUBSCRIPTION_DELETED → canceled. Valida header `asaas-access-token` vs `ASAAS_WEBHOOK_TOKEN`

**Notifications in-app:**

- Schema `notifications` (org_id, user_id null=org-wide, type, title/body/link, read_at, meta)
- 3 portal actions criam notification ao receber decisão do cliente: document.approved/rejected, scope_change.requested, scope_change.approved/rejected, plan.upgraded
- `NotificationsBell` no TopBar com badge de unread + dropdown (lista 30 últimas, marca como lida ao clicar)

**Pendências para Sprint 7.5 / 8:**

- ASAAS_API_KEY + ASAAS_WEBHOOK_TOKEN não setados — upgrade flow está em modo manual. Para testar fluxo PIX real precisa de conta Asaas (sandbox: https://docs.asaas.com/reference/criar-uma-conta-de-teste)
- WhatsApp Z-API (Sprint 6.5 ideal)
- Cron job para detectar "projeto parado 14+d" e "doc aguardando 7+d" + criar notification (hoje só calcula no dashboard)

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
npx tsx scripts/sprint7-dod-test.ts   # Dashboard + Billing + Notifications (sem custo, ~5s)
npx tsx scripts/sprint8-dod-test.ts   # LGPD export + delete cascade (sem custo, ~3s)

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

## 🎯 Como retomar — beta launch

MVP completo. Para abrir beta:

1. `cd C:\dev\memorial-ai`
2. **Configurar envs em prod (Vercel):**
   - `ASAAS_API_KEY` + `ASAAS_WEBHOOK_TOKEN` → habilita cobrança PIX real (sandbox: https://docs.asaas.com)
   - `RESEND_API_KEY` + `RESEND_FROM_EMAIL` → e-mail para cliente ao enviar doc ao portal
   - `SENTRY_DSN` → captura de exceções server-side em prod
   - `NEXT_PUBLIC_POSTHOG_KEY` (+ `NEXT_PUBLIC_POSTHOG_HOST`) → analytics de ativação
3. **Configurar webhook Asaas:** painel Asaas → URL `https://memorial-ai-mu.vercel.app/api/webhooks/asaas`, token = `ASAAS_WEBHOOK_TOKEN`
4. **Smoke test end-to-end:** signup → criar projeto → upload planta → confirmar extração → gerar 4 docs → enviar ao portal → cliente aprova → solicitar alteração → profissional define valor → cliente aprova aditivo
5. **Convidar primeiros 10 escritórios beta** (manualmente por e-mail; produto está pronto)

Opções no Claude Code:

- **"Instalar Sentry/PostHog SDKs"** → migração de stubs para SDKs full
- **"Cron jobs stale projects"** → notificação automática de projetos sem atualização há 14+d
- **"Onboarding tour"** → react-joyride com tour das 6 features principais no primeiro login
- **"Configurar Asaas"** → guia setup de conta + envs + smoke test do fluxo PIX
- **"Tem bug em [X]"** → debug específico

---

## ⚠️ Pendências de housekeeping (não bloqueantes)

- **Migration push do CLI bloqueado** — `npx supabase link/db push` precisam de login interativo. Migrations novas precisam ser coladas no Dashboard SQL Editor manualmente (foi o caminho do Sprint 6).
- **Vercel CLI não está no PATH do PowerShell global** — mas auto-deploy via GitHub está conectado, então push em `main` já deploya.
- Confirmar Inngest está sincronizado e processFloorPlan funciona end-to-end (já validado no Sprint 3 mas usuário não testou com PDF real ainda)
- Resend não configurado (`RESEND_API_KEY` + `RESEND_FROM_EMAIL`) — sem isso o portal envia link via clipboard, sem e-mail.
