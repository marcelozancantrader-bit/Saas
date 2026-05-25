# Memorial.ai — Estado da sessão

**Última pausa:** 2026-05-25 (P11) — **Smoke E2E Playwright (regressão landing/SEO/copy + heartbeat diário em prod).**

---

## 🎯 P11 — Smoke E2E Playwright (2026-05-25) — 1 commit

Backlog: "Smoke test E2E mínimo (Playwright)". Saída do "adiado pra pós-beta". Foco: regressão de páginas públicas, SEO e copy crítico. Fluxos autenticados ficam pra V2 (precisariam de fixture Supabase com seed/teardown — escopo grande pra valor incremental).

### Stack

- [`@playwright/test`](package.json) como devDep
- [playwright.config.ts](playwright.config.ts) — chromium-only, baseURL via env (`PLAYWRIGHT_BASE_URL`)
- Scripts: `npm run e2e`, `npm run e2e:install`, `npm run e2e:ui`

### Cobertura

- [tests/e2e/landing.spec.ts](tests/e2e/landing.spec.ts) — headline, CTA signup, pricing com 5 tiers, badge "7 dias grátis" no Pro, FAQ entries chave, footer legal
- [tests/e2e/static-pages.spec.ts](tests/e2e/static-pages.spec.ts) — 11 páginas públicas (sobre, privacidade, termos, ferramentas/\*, blog, login, signup, forgot-password); 404 graceful; portal sem token não vaza
- [tests/e2e/seo.spec.ts](tests/e2e/seo.spec.ts) — `/sitemap.xml` 200 + URLs core; `/robots.txt` permite landing e bloqueia /dashboard /portal /api; meta description + OG title na landing; portal com `noindex`

### CI

[.github/workflows/e2e.yml](.github/workflows/e2e.yml) — 2 triggers:

1. **`workflow_dispatch`** (manual via Actions UI), com input `base_url` editável
2. **`schedule: cron "0 9 * * *"`** — heartbeat diário 9h UTC contra prod. Falha = alerta de deploy quebrado sem precisar de banco de teste.

Artefatos: `playwright-report/` sobe como artifact em falha, retenção 7d.

### Como rodar localmente

```bash
npm run e2e:install         # 1x — baixa Chromium
npm run dev                 # terminal 1
npm run e2e                 # terminal 2 — testa localhost
PLAYWRIGHT_BASE_URL=https://memorial-ai-mu.vercel.app npm run e2e   # testa prod
```

### Não cobre (V2 deliberada)

- Signup/login/auth flows — precisa fixture Supabase
- Criação de projeto + upload de planta — precisa mocks/storage
- Geração de doc IA — custa $ por run em prod
- Portal token + aprovação cliente — precisa seed completo

Esses ficam pro próximo sprint de robustez, depois que o produto tiver volume real de uso e fizer sentido investir em fixtures.

---

**Última pausa anterior:** 2026-05-25 (P10) — **Portfólio público do escritório (`/p/[slug]`) — diferencial competitivo + SEO/aquisição.**

---

## 🌐 P10 — Portfólio público (2026-05-25) — 1 commit

Sugestão direta da análise de viabilidade. Cada escritório ganha rota pública `/p/<slug>` indexável pelo Google, com projetos concluídos como vitrine. Diferencial vs concorrentes BR (Construflow/Sienge/MetaEng) que não oferecem portfolio aberto.

### Modelo opt-in em 2 camadas

1. **Org liga** `portfolio_enabled` + escolhe slug único em `/configuracoes` (card "Portfólio público")
2. **Por projeto**, owner/admin marca `portfolio_visible=true` em `/projetos/<id>?tab=visao` (card "Portfólio público")

Só aparece no portfolio quando AMBOS estão ativos E o `status='concluido'`.

### Arquivos

- **Migration** [20260729000001_portfolio_publico.sql](supabase/migrations/20260729000001_portfolio_publico.sql) — `organizations.portfolio_slug` (unique parcial ci), `organizations.portfolio_enabled`, `projects.portfolio_visible` + index parcial.
- **Loader** [server/services/portfolio-loader.ts](server/services/portfolio-loader.ts) — service-role, valida slug, carrega org + projetos visíveis. Thumbnail vem da última foto do diário de obra (`portal_visible=true`) via signed URL 7d.
- **Rota pública** [app/p/[slug]/page.tsx](app/p/[slug]/page.tsx) — RSC, robots index, generateMetadata com OpenGraph dinâmico, grid 3-col responsivo com card por projeto (nome + tipologia + área + padrão + endereço + foto).
- **Toggle por projeto** [components/features/projects/PortfolioToggleCard.tsx](components/features/projects/PortfolioToggleCard.tsx) — estados visuais (org desconfigurada / status != concluido / publicado / não publicado).
- **Setting da org** [components/features/configuracoes/PortfolioSettingsCard.tsx](components/features/configuracoes/PortfolioSettingsCard.tsx) — input slug + toggle enabled + auto-suggest do nome via [lib/portfolio/slug.ts](lib/portfolio/slug.ts).
- **Actions** [toggle-portfolio-visibility.action.ts](server/actions/projects/toggle-portfolio-visibility.action.ts) + [set-portfolio-config.action.ts](server/actions/organizations/set-portfolio-config.action.ts) — owner/admin only, validação de slug regex + unicidade.
- **Sitemap** [app/sitemap.ts](app/sitemap.ts) — fetch dinâmico das orgs com portfolio enabled (revalidate 6h). Portfolios entram no sitemap automaticamente.

### ⚠️ Migration pendente em prod

- **`20260729000001_portfolio_publico.sql`** — sem aplicar, queries em `portfolio_slug` / `portfolio_visible` falham.

### SEO

`/p/<slug>` é robots-index. Metadata dinâmica usa nome do escritório no title/og. Conteúdo único por org (fotos de obra + responsável técnico + projetos entregues) — alimenta long-tail SEO ("arquiteto em Palmitinho", "obra residencial em Porto Alegre" etc).

---

**Última pausa anterior:** 2026-05-25 (P9) — **Quantitativo automático IA da planta (prompt v2 + UI editável + integração no orçamento).**

---

## 📐 P9 — Quantitativo IA da planta (2026-05-25) — 1 commit

Backlog: "extender extração pra gerar lista de materiais alimentando orçamento". Estado anterior: v3 derivava portas/janelas/louças heuristicamente via `contarPorTipo(ambientes, [...])` — funcionava razoavelmente mas era opaco e impreciso (suite com porta de quarto + porta de banheiro contava 1).

### Mudança chave: prompt v2

Novo arquivo [lib/ai/prompts/extract-floor-plan.v2.ts](lib/ai/prompts/extract-floor-plan.v2.ts) estende v1 com seção `quantitativos`:

| Campo              | O que conta                                                |
| ------------------ | ---------------------------------------------------------- |
| `portas_internas`  | TODAS as portas dentro (suite com banh = 2)                |
| `portas_externas`  | Entrada + serviço + acesso varanda externa                 |
| `janelas_grandes`  | Sala, quarto, suíte, cozinha (≥ 1.2m)                      |
| `janelas_pequenas` | Basc/maxi-ar de banh, lavabo, área serviço                 |
| `bacios`           | 1 por banheiro + 1 por lavabo                              |
| `lavatorios`       | 1 por banheiro/lavabo, 2 em suítes premium                 |
| `pias_cozinha`     | 1 por cozinha + 1 por área serviço                         |
| `m_rodape`         | Comprimento linear estimado (null se planta sem cotas)     |
| `m2_rev_parede`    | m² cerâmica de parede (banh = ~25m² cada, cozinha = ~15m²) |

v1 nunca é sobrescrito (regra inegociável do CLAUDE.md).

### Integração

- **Extractor** [lib/ai/extract-floor-plan.ts](lib/ai/extract-floor-plan.ts) importa de v2 — `PROMPT_VERSION` vira `extract-floor-plan.v2`. Resultado persiste em `meta.extracao_planta.quantitativos`.
- **v3 das regras** [lib/budget/rules/v3.ts](lib/budget/rules/v3.ts) ganha helper `preferQuantitativo(p, key, fallback)` — preferre número da IA, cai no heurístico se ausente. Atualizadas: `ruleEsquadrias` (portas/janelas), `rulePisosRevestimentos` (m² rev parede), `ruleAcabamentosLineares` (rodapé + soleira + peitoril), `ruleLoucasMetais` (bacios/lavatórios/pias). **Projetos antigos sem quantitativos continuam funcionando** — fallback automático.
- **`ExtractedPlantaV3.quantitativos?`** é opcional — compat retro total.
- **`confirm-extraction.action.ts`** agora aceita campo opcional `quantitativos` e persiste em `meta.extracao_planta`.

### UI

[ExtractionReview.tsx](components/features/extraction/ExtractionReview.tsx) ganha card azul "📊 Quantitativos da IA" com grid 4-colunas de inputs editáveis. Badge indica se veio da IA (v2) ou se será usada heurística (v1 antigo). Edição inline → "Confirmar e atualizar projeto" envia tudo junto.

### Sem migration

Tudo persiste em `meta jsonb` existente. Zero novo schema.

### Validação rodando

Próximo upload de planta vai usar v2 automaticamente. Custo da extração estima-se +5-10% em tokens (output ligeiramente maior por causa do bloco quantitativos), mas ROI é claro: orçamento mais preciso, menos retrabalho do arquiteto.

---

**Última pausa anterior:** 2026-05-25 (P8) — **Reminder D-1 do trial + cleanup ao converter (fecha ciclo P7).**

---

## 📨 P8 — Reminder D-1 + cleanup conversão (2026-05-25) — 1 commit

Continuação direta do P7. Trial em si já funcionava; faltava (a) lembrar quem está acabando antes de virar pumpkin e (b) fechar sub trialing quando o cara converte de fato.

### Conversion cleanup

- **Webhook Asaas `PAYMENT_RECEIVED`** ([app/api/webhooks/asaas/route.ts](app/api/webhooks/asaas/route.ts)) agora também cancela sub `status='trialing' provider='trial'` da mesma org quando pagamento confirma. Senão a sub trialing ficava fantasma até o cron das 9:35 expirar.
- **Upgrade manual** ([server/actions/billing/upgrade-plan.action.ts](server/actions/billing/upgrade-plan.action.ts)) idem — fecha trialing quando manual upgrade roda.

### Reminder cron

- [`server/jobs/trial-reminder-cron.ts`](server/jobs/trial-reminder-cron.ts) — diário 9:30 BRT. Busca trialing+trial com `current_period_end` entre 12h-36h no futuro (janela ampla). Dedup via `subscriptions.meta.reminder_sent_at` (1 reminder por trial). Envia notification + e-mail Resend pros owners/admins.
- Template `renderTrialReminderEmail` em [lib/email/templates.ts](lib/email/templates.ts) — assunto "Seu trial Pro acaba amanhã (DATA)", CTA "Assinar agora".
- Literatura SaaS: D-1 reminder dá +15-30% trial-to-paid conversion. Esse pequeno cron tende a ser dos features mais ROI da sessão.

### Sequência dos crons trial (9:30-9:35 BRT)

1. `trial-reminder-cron` (9:30) — avisa quem acaba em 24h
2. `expired-trials-cron` (9:35) — downgrade quem já passou

Não tem race condition: o reminder pega janela 12-36h no futuro; expirar pega cpe < now. Conjuntos disjuntos.

---

**Última pausa anterior:** 2026-05-24 (P7) — **Trial pré-pago 7d no plano Pro (alavanca direta de conversão #13 do backlog).**

**Sessões anteriores:**

- 2026-05-21 manhã: painel super-admin Fases 1-8 (12 rotas /admin/\*)
- 2026-05-21 tarde: 4 waves globais (landing + Cmd+K + admin search + a11y) + redesign dashboard
- 2026-05-21 noite: audit fluxo planta→orçamento + CUB estadual + IA plano diretor + recuos medidos + smoke test PDF real + 4 fixes + SINAPI nacional
- 2026-05-21 madrugada P1: blindagem pré-beta (rate-limit + Sentry + captcha + cancelar plano self-service + UF dinâmico + admin SINAPI/CUB + verificação e-mail + RLS audit)
- 2026-05-21 madrugada P2: polish pós-deploy (8 fixes visíveis + auto-push)
- 2026-05-21 madrugada P3: auditoria UX completa (6 commits, ~15 fixes em portal/copy/dashboard/briefing/orçamento/a11y)
- 2026-05-23 P4: 3 batches I/J/K (auth + workspace + portal gating + billing PT-BR)
- 2026-05-23 P5: 5 features novas L–P (onboarding, contratos CAU, cotação, diário, WhatsApp)
- 2026-05-23 P6: sprint maratona — substituir item, composição própria, fix SINAPI, layout, landing, análise viabilidade, R-X, Y/Z (CI), AA (convite), BB (PostHog)
- 2026-05-24 P7: trial pré-pago 7d Pro — esta sessão

---

## 🎁 P7 — Trial pré-pago de 7 dias (2026-05-24) — 1 commit

Backlog #13. Conversion lever clássico: orgs free podem ativar trial Pro de 7 dias sem cartão. Quando expira, downgrade automático pra free via cron — sem cobrança, sem fidelidade. 1 trial por workspace lifetime (anti-abuse via `organizations.trial_started_at`).

### Arquitetura

- **Schema**: `subscriptions.status='trialing'` já existia (Sprint 7). Adicionado:
  - `organizations.trial_started_at timestamptz` (1 trial lifetime / org)
  - `subscriptions.provider` aceita `'trial'` além de asaas/stripe/manual
- **Helper canônico** `lib/billing/trial.ts` — `TRIAL_PLAN='pro'`, `TRIAL_DAYS=7`, `resolveTrialState()` (never_started/active/expired/converted), `canStartTrial()`, `trialDaysRemaining()`
- **Action** `server/actions/billing/start-trial.action.ts` — owner/admin, org.plano=free, trial_started_at IS NULL. Cria subscription trialing + upgrade org pra pro + marca anti-abuse. Notification + audit_log + PostHog event `subscription.trial_started`. Rollback de sub se org update falhar.
- **Cron** `server/jobs/expired-trials-cron.ts` — diário 9:35 BRT (30min após expired-cancellations). Encontra subs trialing+trial com cpe < now, marca canceled, downgrade org pra free, notification + audit + e-mail Resend pros owners (gated).
- **UI banner global** `components/features/shell/TrialBanner.tsx` (RSC) — entre AnnouncementBanner e main no AppShell. 3 tons: azul (≥3d), âmbar (1-2d), vermelho (0d=hoje). CTA "Manter Pro" → /billing.
- **UI billing**: `StartTrialCard` (azul/sparkles, sem cartão, 6 features destacadas) pra orgs com `canStartTrial`. Estado trial ativo mostrado no Card "Plano atual". Mensagem "você já testou" pra expirado+free.
- **E-mail** `renderTrialExpiredEmail` em `lib/email/templates.ts` — disparado pelo cron.

### Landing

- Hero subtitle: "+ 7 dias de Pro grátis sem cartão"
- Card Pro do PricingTable: badge "✨ 7 dias grátis · sem cartão" abaixo do preço
- FAQ: nova entrada "Tem trial grátis pra testar o Pro?"

### ✅ Migrations aplicadas em prod (2026-05-25)

- `20260728000001_org_trial.sql` — trial pré-pago
- `20260727000004_internal_review.sql` — revisão hierárquica (Batch X do P6)
- `20260727000003_invitations.sql` — convite de membros (Batch AA, já estava aplicada; migration tornada idempotente em `65f14bf`)

**0 migrations pendentes em prod.**

### Backlog que sobrou

- **#19 App mobile Capacitor** (~1-2 semanas, $99/ano Apple + $25 Google)
- **Smoke test E2E Playwright** (adiado pra pós-beta)
- **Publicar OAuth Google** (sair do modo teste — precisa domínio + tela consentimento)
- **Portfolio público do escritório** (org-slug.memorial.ai com obras concluídas)
- **Quantitativo automático IA da planta** (extender extração pra gerar lista de materiais)
- **Trial reminder e-mail D-3 / D-1** (cron separado disparando antes da expiração — alavanca de conversão extra)

---

**Source-of-truth do produto:** `C:\Users\zanca\OneDrive\Desktop\Saas\` (`CLAUDE.md`, `PROMPT_CLAUDE_CODE.md`, `ANALISE_MERCADO.md`)
**Plano original:** `C:\Users\zanca\.claude\plans\saas-eng-e-arq-tender-curry.md`
**App live:** https://memorial-ai-mu.vercel.app · **Último commit pushed:** `a0b4766` (tudo em prod)
**Repo:** https://github.com/marcelozancantrader-bit/Saas

---

## 🏁 P6 — Sprint maratona (2026-05-23) — 26 commits

### Polish UX visíveis (3 batches)

- `37f1c5a` **Batch I — auth polish**: aria-label reset pwd, toast.success no fluxo reset, copy reset/sobre/FAQ humanizados, "grátis" padronizado
- `fcd4aee` **Batch J — máscaras CPF/PIX**: prof_cpf maskCpf, PIX mascarado por tipo, SendToPortalButton gated se projeto sem cliente
- `e94d756` **Batch K — billing histórico PT-BR**: status traduzidos, cores distintas (Ativa verde, past_due vermelha, "Ativa (cancelando)" amber)

### Editor de orçamento (2 features)

- `47fcae4` **Substituir item SINAPI** na tabela do orçamento (busca + click substitui mantendo qty)
- `1f7394c` **Composição própria** no AddItemDialog (toggle SINAPI / livre)
- `38f2b0f` **Layout orçamento** — Curva ABC vai acima da tabela (sem scroll horizontal)

### 5 features grandes (batches L–P)

- `06d3a56` **L — Onboarding gamificado**: checklist 4 passos no dashboard
- `4f6d233` **M — Templates de contrato CAU**: 6 modelos (Residencial PF/PJ, Comercial, Reforma, Projeto Legal, Completo+RT) com refs CAU/BR
- `aff2bd5` **N — Cotação de fornecedor**: PDF + XLSX agrupado por 13 famílias
- `cc980bc` **O — Diário de obra com fotos**: nova aba, captura câmera celular, toggle portal
- `2e25b23` **P — WhatsApp Business**: Z-API gated; notificação cliente
- `d57bd85` **Q — Diário no portal cliente**: cliente vê entradas marcadas

### Fix crítico

- `b682ef8` **Bug PostgREST max_rows** escondia 17 UFs de novo — fix com paginação real (`selectAllRows`)

### Landing + análise

- `77c7572` **Landing atualizada** 12 → 16 features + Comparison + FAQ + metric 27 UFs
- `001cfd2`, `79d1b09` docs NEXT_SESSION P4 e P5
- **Análise de viabilidade** (3 agents, ~50 fontes) — TAM R$ 2,3bi/ano, SAM R$ 655M/ano, SOM 3 anos R$ 6-32M ARR. Tese: vertical SaaS + IA generativa em AEC = janela aberta. Bootstrap até R$ 50-80k MRR, depois seed R$ 2-4M

### Sprint R-X (Quick wins + lock-in)

- `5755734` **S — Importar do projeto anterior** em /projetos/novo
- `ad96095` **T — Diff entre versões** de documento (chars, words, sections novas/removidas)
- `02e657d` **R — Tour guiado overlay** com shepherd.js no primeiro acesso
- `6b492e0` **U — 3 ferramentas grátis SEO**: orçamento SINAPI, honorário CAU, CUB regional
- `99e9adb` **V — Blog técnico** com 4 posts (memorial NBR, SINAPI passo-a-passo, contrato CAU, aditivos)
- `eacb9ea` **W — Biblioteca de templates do escritório** com substituição de variáveis `{{cliente.nome}}` etc

### Infra + multi-user (Y/Z/AA/X/BB)

- `f6183b4` **Y — UI gerenciar templates** + **Z — CI GitHub Actions** (typecheck + lint em todo PR)
- `867b005` **AA — Sistema de convite de membros** (tabela invitations + UI /configuracoes/membros + landing /convite/[token] + e-mail Resend gated)
- `90f4190` **X — Multi-user aprovação hierárquica**: status `aguardando_revisao_interna`, member solicita, owner/admin aprova/recusa com comentário
- `a0b4766` **BB — PostHog instrumentation**: captureServer + PosthogIdentify auto + 4 eventos chave do funnel (project.created, document.generated, document.sent_to_portal, portal.document_decided). Gated em key.

### ✅ Migrations aplicadas em prod

Todas P6 aplicadas (`project_diary`, `org_doc_templates`, `invitations`, `internal_review`).
Ver seção P7 acima pro status consolidado pós-trial.

### Configurações externas opcionais (app funciona sem)

- **PostHog** — conta posthog.com + setar `NEXT_PUBLIC_POSTHOG_KEY` + opcional `NEXT_PUBLIC_POSTHOG_HOST` no Vercel. Funnel começa a popular automaticamente.
- **Z-API WhatsApp** — conta z-api.io + `WHATSAPP_PROVIDER=z-api`, `ZAPI_INSTANCE_ID`, `ZAPI_TOKEN`, `ZAPI_CLIENT_TOKEN` (opcional).
- **Resend** — verificar domínio + setar `RESEND_API_KEY` + `RESEND_FROM_EMAIL`. Sem isso, convite de membro + notificação portal funcionam só pelo link copiado, sem e-mail automático.
- **Sentry** — conta sentry.io + `SENTRY_DSN`.
- **Asaas produção** — homologação 3-5 dias úteis + trocar `ASAAS_ENVIRONMENT=production` + nova `ASAAS_API_KEY`.
- **Domínio próprio** — registrar + DNS + atualizar `NEXT_PUBLIC_APP_URL` no Vercel + Site URL/Redirect URLs no Supabase Auth.

### Backlog pra próxima sessão

- **#13 Trial 7/14d** pré-pago (alavanca de conversão direta — médio escopo)
- **#19 App mobile Capacitor** (escopo grande, ~1-2 semanas, $99/ano Apple + $25 Google)
- **Smoke test E2E Playwright** (adiado pra pós-beta)
- **Publicar OAuth Google** (sair do modo teste — precisa domínio + tela consentimento)
- **Portfolio público** do escritório (org-slug.memorial.ai com obras concluídas — sugestão da análise de viabilidade)
- **Quantitativo automático IA** da planta (extender extração pra gerar lista de materiais alimentando orçamento)

---

## 🚀 P5 — 5 features novas (2026-05-23) — 5 commits

Pesquisa via 2 agents (inventário + benchmark de 12 concorrentes BR) gerou
12 candidatas em 3 categorias. Marcelo escolheu 5 (1, 2, 3, 4, 7). Executei
em batches autônomos com auto-permission mode ativo.

### `06d3a56` Batch L — Onboarding gamificado (#1)

Checklist no dashboard após WelcomeCard sumir (≥1 projeto). 4 passos:
criar projeto → extrair planta → gerar documento → enviar ao portal. Barra
de progresso animada, CTA azul no próximo passo, steps concluídos verdes
com checkmark. Dismiss persiste em `organizations.meta.onboarding.dismissed_at`.

### `4f6d233` Batch M — Templates de contrato CAU (#2)

6 templates em `lib/contract-templates/templates.ts`: Residencial PF,
Residencial multifamiliar PJ, Comercial, Reforma/Retrofit, Apenas Projeto
Legal, Projeto Completo + RT. Cita resolução CAU/BR aplicável (51/2013,
67/2013, 91/2014) e injeta diretivas específicas. Dialog de escolha abre
quando usuário clica "Gerar contrato" no menu. `prompt_versao` salvo fica
`contrato.v1+residencial_pf` pra rastreio.

### `aff2bd5` Batch N — Cotação de fornecedor PDF/XLSX (#3)

Botão "Pedido de cotação" no orçamento. Classificador heurístico
(`lib/budget/family-classifier.ts`) agrupa em 13 famílias (alvenaria,
esquadrias, pisos, elétrica, hidráulica, cobertura, gás, HVAC, etc).
PDF formatado pra fornecedor preencher coluna "Preço unit. (R$)" + XLSX.

### `cc980bc` Batch O — Diário de obra com fotos (#4)

**Migration 20260727000001_project_diary.sql PENDENTE de aplicar no Dashboard.**

Nova aba "Diário de obra" em `/projetos/[id]?tab=diario`. Até 6 fotos por
entrada (JPG/PNG/WebP/HEIC, 8MB cada). Input com `capture="environment"`
abre câmera no celular. Toggle "olho aberto/fechado" mostra/esconde do
portal do cliente. RLS dupla: members + anon via portal_token. Fotos em
bucket `project-files` com path `<org_id>/<project_id>/diary/<entry_id>-N`.

### `2e25b23` Batch P — WhatsApp Business (#7)

Provider-agnostic e gated em `WHATSAPP_PROVIDER`. V1: Z-API (provider BR
popular). Action `send-to-portal` agora dispara tanto Resend e-mail
quanto WhatsApp template (canais independentes). Sem provider configurado,
fluxo continua com e-mail.

**Setup externo (opcional):** conta https://z-api.io + envs
`WHATSAPP_PROVIDER=z-api`, `ZAPI_INSTANCE_ID`, `ZAPI_TOKEN`,
`ZAPI_CLIENT_TOKEN` (opcional).

### Pendências externas do P5

1. **Aplicar migration 20260727000001_project_diary.sql** no Supabase
   Dashboard (mesmo padrão de migrations anteriores)
2. **Conta Z-API + envs** quando quiser ativar WhatsApp (opcional)

---

## 🎨 P4 Polish UX continuação (2026-05-23) — 3 commits

3 batches (I/J/K) cobrindo auth, workspace, portal e billing — detalhes
no histórico de commits 37f1c5a, fcd4aee, e94d756.

---

## 🎨 P4 Polish UX continuação (2026-05-23) — 3 commits pushed

Auditoria via 2 agents Explore (auth + docs/billing/settings) atrás de
áreas não-cobertas pelos P2/P3. Triagem manual descartou achados falsos
(agents inventaram alguns) e confirmou ~10 reais. 3 batches:

### `37f1c5a` Batch I — auth polish

1. **ResetPasswordForm** ganha `aria-label` no toggle Mostrar/Ocultar
   (LoginForm/SignupForm já tinham).
2. **Reset password fluxo**: action retornava `redirect()` direto, então
   o cliente nunca via toast de sucesso. Agora retorna `{ok:true}`, o
   client component dispara `toast.success("Senha atualizada. Entrando…")`
   - `router.push("/dashboard")`.
3. **Reset password copy**: "Você acessou via link de recuperação. Escolha
   uma senha forte..." → "Crie uma senha forte pra voltar ao seu workspace.
   Mínimo 8 caracteres." (mais humano).
4. **`/sobre` typo**: "engeneheiro" → "engenheiro".
5. **FAQ "URL com token UUID"** → "link único por cliente que você manda
   por WhatsApp ou e-mail" (zero jargão pra Camila).
6. **Padroniza "gratuito"** → "grátis" no botão signup (login link já
   usava grátis).

### `fcd4aee` Batch J — máscaras CPF/PIX + gating portal

1. **WorkspaceForm `prof_cpf`**: aplica `maskCpf` no carregamento + no
   onChange. Antes ficava sem formato visual até primeiro toque (o campo
   `cnpj` principal já mascarava).
2. **WorkspaceForm chave PIX**: máscara dinâmica por tipo (cpf→maskCpf,
   cnpj→maskCnpj, telefone→maskPhone); placeholder telefone trocado pra
   formato BR `(11) 99999-9999`; troca de tipo limpa o campo.
3. **SendToPortalButton ganha prop `hasClient`**: se projeto sem cliente,
   botão desabilitado + hint "Vincular cliente ao projeto" linkando pra
   `/projetos/[id]?tab=visao`. Antes usuário clicava, ação retornava
   erro, e ele descobria via toast.error.

### `e94d756` Batch K — histórico de assinaturas em PT-BR

1. **Status badges**: traduz status cru (`active`/`canceled`/`past_due`/
   `trialing`/`incomplete`/`paused`) → labels PT-BR ("Ativa", "Cancelada",
   "Pagamento atrasado", "Em trial", ...).
2. **Cores distintas**: linha ativa com borda+bg verde leve; `past_due`
   vermelha; demais neutras (outline). Antes era tudo cinza similar.
3. **"Ativa (cancelando)"**: ativa-com-cancelamento-agendado vira badge
   amber separado da ativa renovável (verde).

### Achados refutados (não fixados — agent inventou)

- WorkspaceForm: `tipoPessoa` JÁ sincroniza label CPF/CNPJ corretamente
  via state derivada (`docLabel = tipoPessoa === "pf" ? "CPF" : "CNPJ"`).
- send-to-portal action: JÁ retorna erro específico (`"vincule um cliente
antes de enviar"`) — não é genérico. Mas o gating prévio é melhor UX.
- CancelPlan: `canCancel` JÁ exclui quando `cancel_at_period_end=true`,
  então o botão NÃO aparece em duplicado.
- TiptapEditor título sem `max-w-full`: o `<Input>` shadcn já tem
  `w-full` por padrão. Falso achado.
- GenerateDocumentMenu: JÁ tem `disabled={generating !== null}` e label
  do trigger muda pra "Gerando X…".

---

## 🎨 Sessão polish pós-deploy (2026-05-21 madrugada P2)

Marcelo testou o app em prod após o primeiro push e reportou bugs visíveis.
Sessão dedicada a polish + UX. Auto-push configurado no final.

### 10 commits novos pushed

```
de72173 chore: gitignore .claude/settings.local.json
4f3ef96 fix(shell): remove 'Memorial.ai' duplicado + atalhos sidebar
e5f0a6c feat(budget): BaseDadosBadge — data SINAPI + CUB visível
473eded chore(scripts): check-cub-status pra inspecionar tabela CUB
dc64945 fix(budget): PostgREST limit 1000 escondia 17 UFs do catálogo SINAPI
87e5f7c fix(budget): labels do dialog Regerar (mês + regime)
c120d9a feat(zoneamento): card rico de metadados do plano diretor
80f267b fix(progress): stepper do projeto vira links navegáveis
6465b35 fix(budget): UF detectada por hierarquia robusta
```

### Bugs corrigidos

1. **`6465b35` UF detection** — regex `\b[A-Z]{2}\b` pegava "AV"/"DR" como
   UF. Nova função `resolveProjectUf` com hierarquia: cidade_codigo curado
   → endereco_completo (regex no FINAL + validada contra 27 UFs) →
   clients.endereco_uf → fallback SP.

2. **`80f267b` stepper clickable** — os 7 passos apontavam pra anchors
   `#nome` que não existiam. Viraram `<Link>` apontando pra tab certa:
   Cadastro→?tab=visao, Planta→?tab=planta, Validação→?tab=validacao,
   etc. Documentos+Aprovação vão pra /documentos. ART/RRT→?tab=art-rrt.

3. **`c120d9a` plano diretor info rico** — após IA buscar, antes mostrava
   só "IA · LC X" + 2 badges. Novo `PlanoDiretorMetaCard`: origem, timestamp
   ("há 2 min"), custo USD da consulta, lei vigente em destaque, idade
   com warning >10a, fonte oficial como BOTÃO visual + URL completa,
   observação da IA sobre a zona, disclaimer + link Google pra prefeitura,
   botão "Refazer busca".

4. **`87e5f7c` dialog labels** — Regime mostrava "true"/"false" e Mês
   "2026-05-01" cru. Fix: usa `<span>{label}</span>` no SelectTrigger
   (Base UI Select.Value mostra value raw). Agora "Desonerado"/
   "Não-desonerado" e "mai/2026".

5. **`dc64945` PostgREST limit 1000** — bug crítico. Banco tinha 2592
   rows SINAPI (27 UFs × 96), mas `loadSinapiCatalog` retornava só 1000
   alfabéticos (AC..MA). PR/RS/SP/TO ficavam fora → erro falso "Não há
   dados SINAPI cadastrados pra X". Fix: `.range(0, 99999)` em
   `loadSinapiCatalog` e `loadSinapiStats`.

6. **`e5f0a6c` BaseDadosBadge** — usuário arquiteto não via a data dos
   dados SINAPI/CUB usados. Componente novo aparece em 2 lugares:
   topo de /orcamento (antes de gerar) e header do orçamento criado.
   Mostra "Base de cálculo: SINAPI mai/2026 · CUB-RS mai/2026". Cor
   âmbar + warning se >60d.

7. **`4f3ef96` sidebar dup + atalhos** — `<Logo>` já tem wordmark mas
   havia `<span>Memorial.ai</span>` extra → "Memorial.ai Memorial.ai".
   Removido. Bonus: botões CTA "+ Novo projeto" (azul, destacado) e
   "+ Novo cliente" (outline) entre Workspace e nav. Reduz cliques
   pro fluxo crítico de 3 pra 1.

8. **`473eded` check-cub-status** — script novo `scripts/check-cub-status.ts`
   pra inspecionar tabela CUB em prod via DB URL direta.

### Scripts novos em `scripts/`

| Script                    | Comando       | Pra que serve                                     |
| ------------------------- | ------------- | ------------------------------------------------- |
| `seed-sinapi-nacional.ts` | `npx tsx ...` | Valida/re-aplica seed SINAPI 27 UFs (idempotente) |
| `check-cub-status.ts`     | `npx tsx ...` | Mostra matriz CUB completa do banco               |
| `audit-rls.ts`            | `npx tsx ...` | Auditoria RLS de todas as tabelas                 |

Todos usam `SUPABASE_DB_URL` do `.env.local` via driver `postgres`
(instalado nesta sessão, +1 dep, 50KB).

### Auto-push configurado

Permission rule em `.claude/settings.local.json` (gitignored):

```json
{ "permissions": { "allow": ["Bash(git push origin main)"] } }
```

Agora commits → push imediato → Vercel deploya. Continua bloqueando
force-push, push pra outras branches, comandos bash não-triviais.

### Estado dos dados em prod (confirmado via scripts)

- **SINAPI**: 27 UFs × 96 composições = 2.592 rows em mai/2026
- **CUB**: 27 UFs × 4 padrões = 108 rows em mai/2026
- **Fator regional aplicado**: SE/S=1.00, CO=0.95, NE=0.85, N=0.80
  (aproximação até /admin/sinapi e /admin/cub serem usados com
  dados oficiais por UF)

---

---

## 🛡️ Sessão blindagem pré-beta (2026-05-21 madrugada) — 8 commits prontos

Auditoria profunda do projeto produziu lista priorizada de gaps. P0 críticos

- P1 alto risco implementados. App pronto pra beta — falta config externa.

### 8 commits locais (push pendente)

```
03db06d chore(rls): script de auditoria RLS pra rodar antes do beta
c81c3f8 feat(auth): detecta e-mail não confirmado + botão reenviar
e9c97a7 feat(admin): UI pra atualização manual SINAPI + CUB
5670e68 fix(budget): destrava UF dinâmico + geração inicial sem dialog
1834caf feat(auth): captcha Turnstile no signup (gated)
cbe6da5 feat(app): banner global de announcements no AppShell
39e5e1a feat(billing): cancelar plano self-service em /billing
764e733 feat(robustez): rate limit + Sentry capture em endpoints críticos
```

### Tasks completas (8 + 1 auditoria)

**P0 done**: #4 rate limit, #5 cancelar plano, #17 UF dinâmico, #18 admin SINAPI/CUB
**P1 done**: #6 Sentry, #7 captcha, #9 UI stubs, #10 verificação e-mail
**P2 bônus**: #16 auditoria RLS

### Detalhamento dos 8 commits

1. **`764e733` rate limit + Sentry** — sliding window via Postgres em signup
   (5/h IP), forgot-password (5/h IP), generate-document (15/h org),
   portal/chat (30/h token). `captureException` em 6 catch blocks IA
   (libs/ai + portal/chat + 2 zoneamento). `lib/observability/sentry.ts`
   virou isomorphic.

2. **`39e5e1a` cancelar plano** — `/billing` agora tem botão "Cancelar".
   Action chama DELETE Asaas + marca `cancel_at_period_end=true`. Webhook
   `SUBSCRIPTION_DELETED` respeita esse flag (mantém acesso até period_end).
   Cron Inngest novo `expired-cancellations` (9:30 BRT diário) finaliza
   downgrade pra free.

3. **`cbe6da5` announcement banner** — `loadActiveAnnouncements()` filtra
   por audience (all/paid/plan:X/org:X), banner no `AppShell` acima do
   `main`, dismiss persiste em localStorage. Remove aviso "UI ainda não
   exibe" em /admin.

4. **`1834caf` captcha** — Cloudflare Turnstile, gated. `TurnstileWidget`
   com modo "interaction-only" (invisível pra humanos). `signup.action`
   valida token. Sem `TURNSTILE_SECRET_KEY` setada, dev local bypassa.

5. **`5670e68` UF dinâmico** — `RegenerateBudgetButton` tinha UF=["SP"]
   e mês=["2026-05-01"] hard-coded. Agora `loadSinapiCatalog()` lê banco.
   `GenerateBudgetButton` refatorado pra ir DIRETO (sem dialog) usando
   UF do `endereco_completo` do projeto + mês mais recente da UF.
   Mostra preview "Será gerado pra RS · mês 2026-05 · BDI 28%".

6. **`e9c97a7` admin SINAPI/CUB** — Decisão: opção A (admin manual mensal).
   `/admin/sinapi` com upload XLSX/CSV + preview de 10 linhas + summary
   antes de aplicar. Parser robusto: keys case-insensitive, datas
   Excel/ISO/BR, booleanos flex. `/admin/cub` matriz 27 UFs × 4 padrões
   editável inline. Audit log em cada operação.

7. **`c81c3f8` verificação e-mail** — login.action detecta `email_not_confirmed`
   e retorna `needs_confirmation`. LoginForm mostra banner âmbar + botão
   "Reenviar e-mail". Nova `resend-confirmation.action` com rate-limit.

8. **`03db06d` RLS audit** — Migration `_audit_rls_status` view + script
   `npx tsx scripts/audit-rls.ts` que classifica 🟢/🟡/🔴 cada tabela.
   Análise estática já confirmou: todas 20 tabelas têm RLS habilitada.

### ⚠️ Pendências externas pra abrir beta

**Imediato (~30 min):**

1. `git push origin main` (8 commits, Vercel auto-deploya)
2. Aplicar 2 migrations no Supabase Dashboard SQL Editor:
   - `20260726000001_rate_limit_events.sql`
   - `20260726000002_audit_rls_view.sql`
3. Rodar `npx tsx scripts/audit-rls.ts` pra confirmar RLS ok

**Antes do beta (~1 semana, parte é espera):**

- **Asaas produção** — iniciar homologação (3-5 dias úteis), trocar
  `ASAAS_ENVIRONMENT=production` + nova `ASAAS_API_KEY`
- **Domínio próprio** — registrar + DNS + atualizar `NEXT_PUBLIC_APP_URL`
  no Vercel + Site URL/Redirect URLs no Supabase Auth
- **Resend** — após domínio (DKIM exige domínio verificado). Setar
  `RESEND_API_KEY` + `RESEND_FROM_EMAIL`
- **Turnstile** — cloudflare.com → Turnstile → criar site → setar
  `NEXT_PUBLIC_TURNSTILE_SITE_KEY` + `TURNSTILE_SECRET_KEY` no Vercel
- **Sentry** — sentry.io → projeto Next.js → setar `SENTRY_DSN`

### Tasks pendentes (não-bloqueantes)

- **#8 P1** — Smoke test E2E mínimo (Playwright, ~3-4h) — adia pra pós-beta
- **#11 P2** — PostHog (analytics ativação)
- **#12 P2** — Convidar membros + trocar e-mail
- **#13 P2** — Trial 7d/14d pré-pago
- **#14 P2** — CI GitHub Actions
- **#15 P2** — Publicar OAuth Google (sair modo teste)
- **#19 P2** — App mobile via Capacitor (App Store + Google Play) —
  decisão técnica: WebView aponta pra URL prod (Next 16 não exporta
  estático). Plano detalhado na task: setup ~1-2 semanas, $99/ano
  Apple + $25 Google, push notifications integra com tabela
  `notifications` existente, manter cobrança via Asaas/web pra escapar
  comissão das stores.

---

## ✅ TODAS AS MIGRATIONS APLICADAS EM PROD (Marcelo confirmou)

1. ✅ `20260722000001_org_profissional.sql` — profissional_nome/cpf/endereco em organizations
2. ✅ `20260723000001_platform_admins.sql` — fundação painel /admin + seed founder Marcelo
3. ✅ `20260723000002_feature_flags_announcements.sql` — feature_flags + announcements
4. ✅ `20260725000001_cub_estadual.sql` — CUB por UF (27 UFs × 4 padrões = 108 rows)
5. ✅ `20260725000002_sinapi_all_ufs.sql` — SINAPI nacional (48 códigos × 27 UFs × 2 = 2.592 rows)

**Sem migrations pendentes.** Próximas migrations entram normalmente no fluxo.

---

## 🏗️ Validação do fluxo end-to-end (2026-05-21 noite — última frente)

**Marcelo pediu**: testar fluxo planta→IA→plano diretor→validação→orçamento dentro do CUB. Eu rodei smoke test programático com PDF real (Projeto Arquitetônico.pdf, Palmitinho/RS).

### Pipeline validado em 3 rodadas (custo total $0.10 nas 3)

| Métrica          | Rodada 1 (inicial) | Rodada 2 (prompt v2) | Rodada 3 (SINAPI nacional)     |
| ---------------- | ------------------ | -------------------- | ------------------------------ |
| Área             | null ❌            | 125 m² ✓             | 125 m² ✓                       |
| Itens com SINAPI | 5/11               | 12/30                | **39/39 (100%)** ✅            |
| Total c/ BDI     | R$ 25k             | R$ 79k               | **R$ 394.613**                 |
| R$/m²            | R$ 0               | R$ 504               | **R$ 2.466**                   |
| CUB status       | falso ABAIXO       | ABAIXO real          | ✅ **DENTRO** (RS 2.400-3.000) |

### 4 fixes commitados (`0b37c4e`)

1. **CUB guard pra área zero** (`lib/budget/cub.ts`)
   - Status `inconclusive` quando area=0 ou total=0 (em vez de "abaixo" falso)
   - `CubStatusBadge` mostra card cinza com mensagem clara
2. **Aviso ExtractionReview** (`components/features/extraction/ExtractionReview.tsx`)
   - Banner amber crítico se area_total ou padrao_construtivo vierem null
   - Banner amber leve se confianca='baixa' mesmo com campos OK
3. **Prompt extração v2** (`lib/ai/prompts/extract-floor-plan.v1.ts`)
   - NOVA regra crítica: `area_total_m2` NUNCA mais null
   - 4 cenários explícitos: cota total → alta / parciais → media / estimar por escala → baixa
   - `area_m2` por ambiente segue conservador (null se cota ilegível)
4. **CUB estadual + SINAPI nacional** (migrations 0725000001/2)
   - CUB: 27 UFs × 4 padrões com fator regional (SE/S=1.0, CO=0.95, NE=0.85, N=0.80)
   - SINAPI: 48 códigos × 27 UFs × 2 desonerado (mesmo fator regional)
   - `lib/budget/cub.ts` lookup dinâmico com fallback automático

### Scripts de smoke test (em `scripts/`)

- `smoke-test-planta.ts` — roda pipeline end-to-end com PDF + cidade/UF (uso debug local)
- `inspect-sinapi.ts` — lista UFs/meses/composições no banco
- `list-sinapi-codes.ts` — compara códigos usados pelo sistema vs presentes em SP
- `test-env.ts` — valida que dotenv carrega `.env.local` (precisa `override: true`)

**Como rodar**: `cd C:\dev\memorial-ai && set -a && . ./.env.local && set +a && npx tsx scripts/smoke-test-planta.ts "/c/Users/.../planta.pdf" "Palmitinho" "RS"`

### Custo do pipeline completo por projeto

**~$0.034** (R$ 0,19) em **21 segundos**:

- Extração planta (Claude Sonnet 4.6 + vision): $0.020
- Plano diretor IA (Claude Sonnet 4.6 + tool_use): $0.014
- DB queries SINAPI + CUB: ~0ms (cache local)

### Recuos medidos + IA plano diretor (commit `8c2bccd`)

- `RecuosMedidosCard`: 4 inputs (frontal/lateral dir+esq/fundos) + preview live por campo
- `saveRecuosAction` persiste em `meta.recuos_medidos` com timestamp
- `BuscarPlanoDiretorButton`: dialog Cidade+UF, IA Claude retorna ZR-1 estruturada com confiança alta/média/baixa
- Integrado em `/projetos/[id]` aba "validacao"
- `runZoneamentoChecks` agora aceita `recuos_medidos` → severity vira ok/warn/issue por recuo individual

---

## 🌊 Waves de melhorias globais (2026-05-21 tarde — pós painel admin)

Auditoria profunda landing + app + admin + research SaaS high-ticket 2026, depois 4 ondas de implementação:

### Wave 1 — Landing redesign (commit `0f4e5e7`)

Componentes novos em `components/features/landing/`:

- **SocialProof**: 4 badges credibilidade (beta, 10 docs IA, 60s, LGPD)
- **ComparisonTable**: tabela "antes (planilha + Word) vs depois (Memorial.ai)" com 6 linhas
- **RoiCalculator**: client com 2 sliders (projetos/mês + valor-hora) → economia, plano sugerido, ROI%, payback
- **GuaranteeBadge**: 4 cards risk reversal (sem fidelidade, 14d, LGPD, suporte humano)
- **PricingTable**: 5 cards + feature matrix expandível (toggle)

`app/page.tsx` reescrito:

- Headline reduzido pra < 8 palavras ("Memorial técnico em minutos.")
- Hero com social proof inline
- Nova ordem: Hero → Como Funciona → Comparison → Dores → ROI Calc → Funcionalidades → Guarantee → Pricing → FAQ → CTA → Footer
- Link "Sobre" no header e footer; 2 perguntas extra no FAQ

Páginas novas:

- `app/sobre/page.tsx` — história, princípios, tech stack, contato
- `app/(auth)/forgot-password/page.tsx` + `app/(auth)/reset-password/page.tsx`
- `forgotPasswordAction` (sempre ok, evita enumeração de contas)
- `resetPasswordAction` (updateUser via sessão temporária do magic link)
- "Esqueci a senha" link no LoginForm
- middleware: forgot/reset adicionados aos AUTH_PATHS

### Wave 2 — App UX (commit `69a3288`)

- **Cmd+K command palette** (`components/features/shell/CommandPalette.tsx`): global em todo app autenticado; categorias Navegação/Criar/Admin (condicional)/Sistema; keyboard nav + filtro fuzzy; admin items só se isPlatformAdmin
- AppShell agora recebe `isPlatformAdmin` prop; layout protegido busca em paralelo com notifications
- **Tabelas mobile-first**: ProjectsTable + ClientsTable com tabela em ≥md e stack de cards em mobile

### Wave 3 — Admin polish (commit `64795b2`)

- **AdminTopBar search global**: input no header busca orgs (nome/CNPJ) + users (e-mail) em paralelo via `/api/admin/search?q=`; debounce 250ms; dropdown agrupado por tipo
- **Audit drill-down** (`/admin/audit`): `AuditRowExpand` client component com botão "Detalhes" expandindo payload JSON + user-agent inline
- Backend: `server/services/admin-search.ts` + route handler gated

### Wave 4 — Cross-cutting (commit a seguir)

- **HealthRefreshButton**: botão "Atualizar agora" no /admin/health com spin animation
- **Skip-to-content link** no `app/layout.tsx` (a11y): sr-only que aparece ao tab no início da página
- Error boundary `app/admin/error.tsx` (já existia desde fix recharts) mostra error.message inline

---

## 🛡️ Painel Super Admin do SaaS (Fases 1-8 — 2026-05-21 manhã)

**Arquitetura** — tier `platform_admin` SEPARADO do role org-scoped (owner/admin/member). Founder vê toda a plataforma; orgs continuam isoladas via RLS.

**Roadmap 8 fases:**

| Fase                   | Status | Entrega                                                                                                                          |
| ---------------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------- |
| 1. Fundação            | ✅     | Migration `platform_admins` + helper `is_platform_admin()` + layout `/admin` + 9 rotas (1 dashboard + 8 stubs)                   |
| 2. Dashboard KPIs      | ✅     | MRR/ARR/ARPU/churn/LTV reais + 12 cards KPI + 3 gráficos (MRR 12m + signups 12m + distribuição planos)                           |
| 3. Organizations       | ✅     | Lista paginada + busca + filtros + detail (5 KPIs + members + projetos + subs + audit) + ações (mudar plano, suspender/reativar) |
| 4. Users + impersonate | ✅     | Lista global (search + filtro só-admins) + detail + impersonate via magic link com audit                                         |
| 5. Billing/Subs        | ✅     | Lista global de subs + filtros (status/plano/provider) + KPIs (active/MRR/past_due/etc) + cancel manual                          |
| 6. Audit global        | ✅     | Lista filtrada (q/action/actor_type/dates) + paginação + export CSV (até 5000) via /admin/audit/export                           |
| 7. Flags + Broadcast   | ✅     | Migration `feature_flags` + `announcements` + UI CRUD pra ambos + RLS (members leem flags da própria org)                        |
| 8. Health/Cost         | ✅     | Status integrações + custo IA 30d/total (via `documents.custo_tokens.cost_usd`) + storage usage + erros 24h                      |

**Entregas Fase 1 (commit a seguir):**

- `supabase/migrations/20260723000001_platform_admins.sql` — tabela `platform_admins(user_id PK, granted_by, granted_at, notes)` + helper `is_platform_admin(target uuid default auth.uid())` + estende `audit_log.actor_type` com `'platform_admin'` + index parcial
- `lib/auth/platform-admin.ts` — `requirePlatformAdmin()` (server, redireciona) e `isPlatformAdmin()` (boolean)
- `components/features/admin-shell/{AdminShell,AdminSidebar,AdminTopBar,AdminPlaceholder}.tsx` — layout dark dedicado, nav lateral, banner "Modo admin", link "← Voltar ao app"
- `app/admin/layout.tsx` — gate de defense-in-depth via `requirePlatformAdmin`
- 8 stub pages: `/admin/{organizations,users,subscriptions,revenue,audit,feature-flags,announcements,health}`

**Entregas Fase 2:**

- `lib/admin/saas-metrics.ts` — funções puras: `calculateMrrCents`, `calculateArrCents`, `calculatePayingCustomers`, `calculateArpuCents`, `calculateMonthlyChurnRate`, `calculateLtvCents`, `calculatePlanDistribution`, `calculateFreeToPaidConversion` + formatadores BRL/%/compact
- `server/services/admin-metrics.ts` — `loadSaasOverviewMetrics()` faz 7 queries em paralelo via admin client, calcula MRR/ARR/ARPU/churn/LTV + reconstrói histórico mensal 12m
- `components/features/admin-shell/{MrrChart,PlanDistChart}.tsx` — recharts client components (linha + barras)
- `app/admin/page.tsx` reescrito: 6 KPI cards core (MRR, ARR, ARPU, churn, LTV, conversão F→P) + 4 cards volume + 3 cards crescimento + gráfico MRR 12m + gráfico signups 12m + gráfico distribuição de planos + grid de acesso pras 8 seções

**Cores planos:** free=cinza, standard=azul, pro=âmbar (highlighted), pro_max=violeta, agency=verde.

**Entregas Fase 3 (commit a seguir):**

- `server/services/admin-orgs.ts` — `loadAdminOrgList()` paginada (25/pg) com agregados (members, projetos, docs, last_activity, owner e-mail via auth.admin.getUserById) + `loadAdminOrgDetail(orgId)` carrega members + 50 projetos recentes + histórico subs + 30 audit entries + KPIs (docs total/mês, clients)
- `server/actions/admin/change-org-plan.action.ts` — `changeOrgPlanAction` valida via zod, exige motivo, cancela subs ativas anteriores, cria sub `provider='manual'` com meta auditável, registra `org.plan_changed` no audit_log
- `server/actions/admin/suspend-org.action.ts` — `suspendOrgAction` e `unsuspendOrgAction` armazenam flag em `organizations.meta` (sem nova coluna; bloqueio efetivo de login fica pra fase futura) + audit log
- `app/admin/organizations/page.tsx` — tabela com 8 colunas + paginação chevron + filtros via searchParams
- `app/admin/organizations/[id]/page.tsx` — detail page completa com 5 KPI tiles + Members card (com role icon: crown=owner, shield=admin, user=member) + Histórico subs card + Projetos table (20) + Audit log entries (20) + botões "Mudar plano" e "Suspender/Reativar"
- 3 client components: `OrgListFilters` (search + plano select + checkboxes, atualiza searchParams), `ChangePlanDialog` (select + textarea motivo), `SuspendOrgDialog` (textarea motivo, ou botão direto pra unsuspend)

---

## 📌 Sessão 2026-05-20 — 3 grandes frentes

### 1. Overhaul orçamento (v3 + correções)

- **Rules v3** com códigos SINAPI corretos (descrições oficiais). 11 códigos antigos tinham descrição completamente errada (87878 era chapisco, não alvenaria; 89800 era tubo PVC, não forro; 91173/91174 eram fixação de tubos, não janelas).
- **Troca de código por padrão construtivo**: alto/luxo usa porcelanato 87263, porta maciça 100693, quartzo/mármore. Popular/médio usa código padrão.
- **Multiplicador de preço** em vez de inflar quantidade (piso 100m² não vira 133m² em padrão médio).
- **Botão Regerar** na página do orçamento com dialog editável (UF/BDI/mês/regime).
- **Bug Inngest crítico** corrigido: worker descartava ambientes/elementos_especiais — causava 0 pontos elétricos/hidráulicos/louças.
- **"Composição própria"** no PDF em vez de "custom-xxx".
- **Migrations aplicadas**: 20260720000001 (preços com MO), 20260721000001 (códigos corretos), 20260721000002 (porcelanato + porta maciça).

### 2. Zoneamento universal (qualquer cidade BR)

- **Cobertura**: 5 curadas (POA/Curitiba/SP/RJ/BH) + IA pra qualquer outra
- **Fluxo unificado**: UF (select) + Cidade (input com datalist de 170 municípios) + Zona (select)
- **IA lista zonas residenciais** da cidade escolhida via Claude tool_use (1 chamada cobre todas as zonas)
- **Auto-save** ao escolher zona da IA (sem dialog separado)
- **Data do plano diretor em destaque** com warning amarelo se >10 anos sem revisão
- **Sincronização**: CEP do projeto popula cidade/UF do zoneamento automaticamente

### 3. Auditoria de fluxo (13/13 problemas resolvidos)

**Críticos (`4c88819`):**

1. Padrão construtivo: fonte única (`projects.padrao_construtivo` canônico, não meta)
2. Dedup elétrica/hidráulica/estrutural — orçamento não soma 2x mais
3. Contrato/Proposta bloqueados se sem cliente vinculado

**Sprint A+B+C (`7c5044d`):** 4. CEP do projeto popula cidade/UF do zoneamento via ViaCEP 6. Após confirmar extração, redirect pra ?tab=validacao + CTA toast 7. Briefing marcado como "Opcional" (aba + badge + texto) 8. Mesma propagação de UF/cidade (parte de #4) 9. Área terreno da extração popula ProjectForm 10. observacoes IA chegam aos prompts de docs (com hedging se confiança=baixa) 11. Confiança=baixa gera warning no orçamento 12. Warning se ambientes=[] (orçamento silenciosamente incompleto)

**Finais (`554955e`):** 5. ART/RRT pré-preenche profissional (nome/CPF/endereço de organizations) 13. ProjectProgress: "Cadastro" só "done" se cliente + endereço definidos

---

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
