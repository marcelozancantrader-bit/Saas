# Migration Checklist — Memorial.ai → Prumai

> **Status**: Decisão de nome travada em **2026-05-25** (Prumai). Este checklist é o roteiro executivo. Marque `[x]` à medida que for completando.
>
> **Princípio**: nada quebra em prod enquanto o domínio antigo continuar respondendo. A migração é gradual — DNS aponta novo domínio pra mesma Vercel, env vars trocam, copy refatora por último.

---

## 🚀 Fase 1 — Defesa imediata (HOJE, ~1h, ~R$ 350/ano)

Travar domínios + handles antes que squatter pegue. Você pode mudar de ideia depois — o seguro é barato.

### 1.1 Domínios

- [ ] `prumai.com.br` no [registro.br](https://registro.br) — R$ 40/ano
- [ ] `prumai.com` no [Cloudflare Registrar](https://dash.cloudflare.com/registrar) ou Namecheap — ~US$ 10/ano
- [ ] **Defensivos** (se sobrar budget — protege contra confusion squatting):
  - [ ] `detalhia.com.br` (top-1 da rodada 2)
  - [ ] `memoreai.com.br` (plano B)
  - [ ] `croquia.com.br`
  - [ ] `draftia.com.br`

### 1.2 Redes sociais

Criar contas com email da empresa (não pessoal). Mesmo handle em todas pra coerência.

- [ ] **Instagram** `@prumai` — criar conta e fazer **post de placeholder** ("em breve") pra travar
- [ ] **LinkedIn Company Page** "Prumai" — em [linkedin.com/company/setup](https://www.linkedin.com/company/setup/new/)
- [ ] **X/Twitter** `@prumai` (se você usa)
- [ ] **TikTok** `@prumai` (se relevante pra B2B)
- [ ] **YouTube** canal `@prumai` (pra tutoriais futuros)
- [ ] **GitHub** organização `prumai` (se for open-source algo)

### 1.3 Email

- [ ] Configurar `contato@prumai.com.br` no Google Workspace (R$ 30/mês) ou Zoho (grátis até 5 usuários)
- [ ] Forward `noreply@prumai.com.br` → seu email atual (até migrar Resend)

---

## 🔍 Fase 2 — Verificação manual (essa semana, ~2h)

Validações que ferramentas online não conseguem. **Fazer antes de gastar R$ 497 no INPI.**

### 2.1 INPI classe 42 (software/SaaS)

Acessar [busca.inpi.gov.br/pePI](https://busca.inpi.gov.br/pePI/) — exige cadastro grátis.

- [ ] Buscar **Prumai** classe 42 — não pode ter marca registrada idêntica/similar
- [ ] Buscar **Prumo** (já existe Prumo Projetos e Obras AEC) — verificar se há risco fonético
  - Se houver oposição prevista → consultar advogado de propriedade intelectual (~R$ 500 consulta)
- [ ] Buscar **Pruma** classe 42 (segurança extra)

### 2.2 Instagram disponibilidade real

- [ ] Login no Instagram com conta pessoal
- [ ] Buscar `@prumai` — disponível?
- [ ] Se ocupado por conta inativa, considerar variantes: `prumai.br`, `prumai.app`, `usaprumai`

### 2.3 Teste do telefone

- [ ] Ligar pra **1 arquiteto** de fora do círculo: _"Vou te mandar pelo prumai.com.br — entendeu sem soletrar?"_
- [ ] Mesmo teste com **1 engenheiro civil**
- [ ] Se ambos pediram pra repetir/soletrar → reavaliar nome

### 2.4 Negociação com domínio `prumo.com.br` (opcional)

- Se quiser tirar risco de confusão, contatar Prumo Projetos e Obras pra ver se vendem o domínio. Normalmente custaria R$ 500 a R$ 5.000. Skip se já tem orçamento apertado.

---

## 🌐 Fase 3 — DNS e Vercel (~30min, depois que tiver `prumai.com.br`)

Apontar domínio novo pra mesma aplicação Vercel. **Sem downtime.**

### 3.1 Vercel — adicionar domínio

- [ ] [vercel.com/marcelozancantrader-4712s-projects/memorial-ai/settings/domains](https://vercel.com/marcelozancantrader-4712s-projects/memorial-ai/settings/domains)
- [ ] Add `prumai.com.br` (raiz) e `www.prumai.com.br`
- [ ] Vercel mostra os registros DNS necessários (A/CNAME)

### 3.2 registro.br — configurar DNS

- [ ] No painel do registro.br, em "DNS" do `prumai.com.br`:
  - Trocar pra **DNS Master mode** (cliente)
  - Adicionar:
    - `@` A `76.76.21.21` (IP Vercel)
    - `www` CNAME `cname.vercel-dns.com`
- [ ] Aguardar propagação (5min a 2h)
- [ ] Verificar via [dnschecker.org](https://dnschecker.org) que `prumai.com.br` resolve

### 3.3 HTTPS

- [ ] Vercel automaticamente gera certificado Let's Encrypt — verificar que `https://prumai.com.br` carrega
- [ ] Verificar que `prumai.com.br` (sem www) redireciona pra `www.prumai.com.br` (ou vice-versa — decidir o canonical)

### 3.4 Manter domínio antigo

- [ ] **Não desconectar** `memorial-ai-mu.vercel.app` ainda. Os links antigos continuam funcionando. Vai sair de cena em ~30 dias após anúncio público.

---

## ⚙️ Fase 4 — Env vars (15min)

Atualizar `NEXT_PUBLIC_APP_URL` em todos os ambientes.

### 4.1 Vercel — Production

- [ ] [vercel.com/.../settings/environment-variables](https://vercel.com/marcelozancantrader-4712s-projects/memorial-ai/settings/environment-variables)
- [ ] Atualizar `NEXT_PUBLIC_APP_URL` = `https://prumai.com.br`
- [ ] Atualizar **Preview** e **Development** também se aplicável
- [ ] Redeploy production

### 4.2 Variáveis afetadas indiretamente

Não precisa trocar — pegam de `NEXT_PUBLIC_APP_URL` automaticamente:

- ✅ `app/sitemap.ts` (sitemap.xml)
- ✅ `app/robots.ts` (robots.txt)
- ✅ `app/layout.tsx` (OG metadata)
- ✅ `server/jobs/trial-reminder-cron.ts` (links em email)
- ✅ `server/jobs/expired-trials-cron.ts` (links em email)
- ✅ `server/services/portfolio-loader.ts` (URLs portfólio)
- ✅ `server/actions/admin/impersonate.action.ts` (magic links)

---

## 🔐 Fase 5 — Supabase Auth (15min)

Atualizar URLs de redirect pra OAuth/magic links funcionarem no domínio novo.

### 5.1 Site URL

- [ ] [Supabase Dashboard → Authentication → URL Configuration](https://supabase.com/dashboard/project/fittavwljhbwiljvhqsv/auth/url-configuration)
- [ ] **Site URL**: `https://prumai.com.br`
- [ ] **Additional Redirect URLs** (manter os antigos por enquanto):
  - `https://prumai.com.br/**`
  - `https://memorial-ai-mu.vercel.app/**` (manter durante transição)
  - `http://localhost:3000/**` (dev)

### 5.2 OAuth Google

- [ ] [Google Cloud Console](https://console.cloud.google.com) → APIs & Services → Credentials → OAuth Client ID
- [ ] **Authorized JavaScript origins**: adicionar `https://prumai.com.br`
- [ ] **Authorized redirect URIs**: adicionar `https://fittavwljhbwiljvhqsv.supabase.co/auth/v1/callback` (já deve estar)
- [ ] Aproveitar e iniciar **publish do OAuth app** (sair do modo teste):
  - Tela de consentimento → App information
  - URL do app: `https://prumai.com.br`
  - **Política de privacidade**: `https://prumai.com.br/privacidade`
  - **Termos de serviço**: `https://prumai.com.br/termos`
  - Submit pra verificação (3-5 dias úteis)

---

## ✉️ Fase 6 — Resend / Email transacional (~30min, +24h propagação DNS)

Sem domínio próprio verificado, o Resend usa `onboarding@resend.dev` — ruim pra deliverability. Com domínio próprio, e-mails do trial / portal / convites chegam de verdade.

### 6.1 Verificar domínio no Resend

- [ ] [resend.com/domains](https://resend.com/domains) → "Add Domain" → `prumai.com.br`
- [ ] Resend mostra 3 registros DNS (SPF + DKIM + DMARC) — copiar
- [ ] No registro.br, adicionar os 3 TXT records:
  - SPF: `v=spf1 include:_spf.resend.com ~all`
  - DKIM: dois registros que Resend dá (TXT longos)
  - DMARC: `v=DMARC1; p=none;` (mais permissivo no início; depois aperta pra `p=quarantine`)
- [ ] Aguardar verificação Resend (até 24h, geralmente 5min)

### 6.2 Configurar Vercel envs

- [ ] `RESEND_API_KEY` (já deve estar, se não, criar API key no Resend)
- [ ] `RESEND_FROM_EMAIL` = `notificacoes@prumai.com.br` (ou `contato@prumai.com.br`)
- [ ] Redeploy

### 6.3 Smoke test

- [ ] Cria projeto teste → manda doc pro portal → confirma que email chega na caixa do cliente sem cair em spam
- [ ] Trigger trial reminder manualmente (Inngest dashboard) → confirma que chega

---

## 💳 Fase 7 — Asaas webhook (10min)

URL do webhook precisa apontar pro domínio novo pra evitar quebra quando memorial-ai-mu desativar.

- [ ] [sandbox.asaas.com](https://sandbox.asaas.com) (sandbox atual) → Integrações → Webhooks
- [ ] Editar URL: `https://prumai.com.br/api/webhooks/asaas`
- [ ] **Manter `ASAAS_WEBHOOK_TOKEN` igual**
- [ ] Quando migrar pra produção Asaas (homologação 3-5d), criar webhook novo lá já com URL `prumai.com.br`

---

## 🎨 Fase 8 — Copy + branding (~3-4h trabalho de dev, depois do domínio funcionando)

**Quando**: depois que Fase 3-5 estiverem em verde. Pra ter ambiente onde testar.

**O que mudar**: TODO "Memorial.ai" pra "Prumai" em arquivos de UI + email + brand.

### 8.1 Lista de arquivos com refactor necessário

Categoria 1 — **Crítico** (visível pro user em prod):

- [ ] `app/page.tsx` — landing hero, headings, CTAs, FAQ, footer
- [ ] `app/sobre/page.tsx` — about page
- [ ] `app/termos/page.tsx` — termos de uso
- [ ] `app/privacidade/page.tsx` — privacy
- [ ] `app/layout.tsx` — metadata title/description global
- [ ] `app/opengraph-image.tsx` — imagem OG dinâmica
- [ ] `app/not-found.tsx` + `app/error.tsx`
- [ ] `app/(auth)/login/page.tsx`, `signup/page.tsx`, `forgot-password/page.tsx`, `reset-password/page.tsx`
- [ ] `app/portal/[token]/page.tsx` + `layout.tsx`
- [ ] `app/p/[slug]/page.tsx` — portfólio público (footer menciona Memorial.ai)
- [ ] `app/blog/*` — header, layout, posts
- [ ] `app/ferramentas/**/*.tsx` — 4 páginas de ferramentas grátis
- [ ] `app/convite/[token]/page.tsx`
- [ ] `app/admin/page.tsx`
- [ ] `components/brand/Logo.tsx` — wordmark "Memorial.ai" → "Prumai"
- [ ] `components/features/shell/SidebarContent.tsx` — fallback wordmark
- [ ] `components/features/landing/*` (ComparisonTable, RoiCalculator)
- [ ] `components/features/onboarding/*` (WelcomeCard, OnboardingTour, OnboardingChecklist)
- [ ] `components/features/admin-shell/AdminSidebar.tsx`

Categoria 2 — **E-mail templates** (chegam na caixa do cliente):

- [ ] `lib/email/templates.ts` — todos os templates (renderEmailLayout footer, renderDocumentSentEmail, renderTrialExpiredEmail, renderTrialReminderEmail)
- [ ] `lib/whatsapp/templates.ts` — mensagens WhatsApp

Categoria 3 — **Brand assets**:

- [ ] `app/favicon.ico` + `app/apple-icon.png` — refazer com logo Prumai
- [ ] Logo SVG no `components/brand/Logo.tsx` — desenhar símbolo do prumo
- [ ] Cor primária: trocar `#1E3A8A` (azul Memorial) por `#B45309` (bronze Prumai conforme branding research) — ou manter azul como neutro

Categoria 4 — **Baixa prioridade** (comments/docs):

- [ ] `CLAUDE.md` — atualizar título e exemplos
- [ ] `README.md` — atualizar título
- [ ] Comentários em código — deixar `Memorial.ai →` como histórico não atrapalha
- [ ] Migrations antigas — **não tocar** (histórico)

### 8.2 Estratégia de refactor

Não fazer "find & replace" cego. Risco de quebrar variável `MemorialReview` ou similar. Recomendado:

1. Renomear `package.json` `name` de `memorial-ai` pra `prumai`
2. Atualizar `CLAUDE.md` no header
3. Refactor por categoria, usar Edit com contexto preciso
4. Cada commit = uma categoria (auth pages, email templates, landing, etc) — atomicidade
5. Smoke E2E rodando contra prod nova após cada commit

---

## 📋 Fase 9 — INPI / registro de marca (~30min trabalho + R$ 497 + 6-12 meses processo)

- [ ] [gov.br/inpi/E-Marcas](https://www.gov.br/inpi/pt-br/servicos/marcas) — cadastro grátis
- [ ] Pedido de registro classe 42 (software/SaaS):
  - Taxa de pedido: R$ 142
  - Taxa de concessão (pós-aprovação): R$ 355
  - **Total**: R$ 497 por marca/classe
- [ ] Apresentar Prumai com logo (sketch SVG)
- [ ] Aguardar oposição (~6 meses) + análise (~12 meses total)
- [ ] Considerar também classe 9 (apps) e classe 35 (publicidade) se orçamento permitir (+R$ 994)

---

## 🚪 Fase 10 — Desativar Memorial.ai (~30 dias após anúncio público)

Manter domínio antigo respondendo por **30 dias** após comunicação pública. Depois:

- [ ] Anúncio: post no Instagram + LinkedIn + email pros usuários ("agora somos Prumai")
- [ ] Vercel: configurar redirect 301 `memorial-ai-mu.vercel.app/*` → `prumai.com.br/*`
- [ ] Após +60 dias: desconectar `memorial-ai-mu.vercel.app` do projeto Vercel
- [ ] Deixar o domínio vencer no próximo ciclo Vercel (gratuito mesmo)

---

## ⚠️ Ordem crítica e riscos

1. **NÃO mudar copy antes de DNS funcionar.** Se quebrar antes do domínio ativo, app aparece pra user como "site Prumai" mas URL é memorial-ai-mu — confuso.
2. **NÃO desconectar Resend antigo antes do DKIM novo verificar.** Email some por 24h se errar a ordem.
3. **NÃO trocar OAuth redirect antes da Vercel env var.** Login Google quebra.
4. **NÃO publicar OAuth na verificação Google sem privacidade e termos novos.** Eles rejeitam.
5. **Backup `.env.local`** antes de mexer em qualquer env. Guarda em local seguro.

---

## 📊 Tempo total estimado

| Fase                   | Tempo dev | Tempo espera      | Custo            |
| ---------------------- | --------- | ----------------- | ---------------- |
| 1 — Defesa imediata    | 1h        | 0                 | R$ 350/ano       |
| 2 — Verificação manual | 2h        | 0                 | R$ 0             |
| 3 — DNS Vercel         | 30min     | 2h propagação     | R$ 0             |
| 4 — Env vars           | 15min     | 0                 | R$ 0             |
| 5 — Supabase Auth      | 15min     | 3-5d Google OAuth | R$ 0             |
| 6 — Resend DKIM        | 30min     | 24h propagação    | R$ 0 (free tier) |
| 7 — Asaas webhook      | 10min     | 0                 | R$ 0             |
| 8 — Refactor copy      | 3-4h      | 0                 | R$ 0 (eu faço)   |
| 9 — INPI               | 30min     | 12 meses          | R$ 497           |
| 10 — Desativar         | 30min     | 90 dias           | R$ 0             |

**Trabalho ativo total**: ~8-10h espalhadas em 1 semana. **Custo cash imediato**: ~R$ 850. **INPI** (opcional pra MVP, essencial pra escala): R$ 497.
