# Pricing Proposal — Memorial.ai → Prumai

> **Status**: 2026-05-25 — proposta consolidada com base em [PRICING_RESEARCH.md](PRICING_RESEARCH.md) (pesquisa de mercado BR + global) + auditoria interna de feature gating.
>
> Aguarda aprovação do fundador antes de implementar em `lib/plans/limits.ts`.

---

## 1. Diagnóstico em uma página

### O que a pesquisa de mercado mostrou

- **Standard atual (R$ 199,90) está caro pro ponto de entrada pago.** Concorrentes BR diretos (Projete Solo R$ 29, ARQProject R$ 99, Plana 1 R$ 79,90, Projetolist Start R$ 74,50, Vobi R$ 103) cobram **R$ 100-170 abaixo**.
- **Pro Max (R$ 699,90) está em terra de ninguém** — acima do Vobi/Construflow Básico (R$ 699 com usuários ilimitados) e canibaliza o Agência.
- **Faltam ciclos transparentes com desconto anual** — padrão BR é 15-25%. Ninguém AEC mostra preço PIX à vista (diferencial real).
- **5 tiers (Free + 4 pagos + Agência) é acima da média do mercado** — 3-4 tiers é o padrão. 5 sinaliza indecisão.

### O que a auditoria interna revelou

Várias features novas (P5-P11) **não estão gated por plano** — significa que Free usa de graça features que deveriam ser exclusivas de planos pagos. Isso destrói valor:

| Feature                                | Hoje                                      | Deveria ser       |
| -------------------------------------- | ----------------------------------------- | ----------------- |
| Quantitativo IA da planta (P9)         | Livre pra todos os planos                 | Pro+              |
| Diário de obra com fotos (P5)          | Livre pra todos                           | Pro+              |
| Templates contrato CAU (6 modelos)     | Todos os 6 livres                         | Free=1, Pro=todos |
| Revisão hierárquica multi-user (X)     | Livre, sem check                          | Studio+           |
| **Convite de membros (AA)**            | ❌ **Sem check de `maxUsers`**            | Bug — corrigir    |
| WhatsApp Z-API (P5)                    | Gated por env, não por plano              | Pro+              |
| Biblioteca templates do escritório (Y) | Livre                                     | Pro+              |
| Portfólio público `/p/[slug]` (P10)    | ✅ Gated em `portfolio_enabled` (correto) | Solo+             |
| Portal cliente + assinatura            | ✅ Gated (Standard+)                      | Manter            |
| Branding custom + watermark            | ✅ Gated                                  | Manter            |

**Bug crítico**: `inviteMemberAction` não valida o limite `maxUsers` do plano. Um Free pode convidar infinitos membros — perda de valor + risco financeiro.

---

## 2. Proposta concreta

### 2.1 Nova estrutura — **4 planos + Agência**

| Plano       | Mensal        | Anual (-20%)  | PIX à vista anual (-25%)            | Target                                 |
| ----------- | ------------- | ------------- | ----------------------------------- | -------------------------------------- |
| **Free**    | R$ 0          | —             | —                                   | Captura / SEO / experimentar           |
| **Solo**    | **R$ 89,90**  | R$ 71,90/mês  | R$ 67,40/mês (R$ 808,80 à vista)    | Camila autônoma 1-3 proj/mês           |
| **Pro** ⭐  | **R$ 219,90** | R$ 175,90/mês | R$ 164,90/mês (R$ 1.978,80 à vista) | Profissional consolidado 5-10 proj/mês |
| **Studio**  | **R$ 499,90** | R$ 399,90/mês | R$ 374,90/mês (R$ 4.498,80 à vista) | Escritório 3-8 pessoas                 |
| **Agência** | Sob consulta  | —             | —                                   | 10+ usuários, multi-org, SLA           |

⭐ Pro = plano "mais popular" (highlighted), captura ~60-70% das contas pagas pela regra das três opções.

### 2.2 Features por plano — completo

| Recurso                                                       |       Free        |   Solo    |    Pro    |      Studio       |    Agência    |
| ------------------------------------------------------------- | :---------------: | :-------: | :-------: | :---------------: | :-----------: |
| **Limites quantitativos**                                     |                   |           |           |                   |               |
| Projetos ativos                                               |         1         |     5     |    25     |     Ilimitado     |   Ilimitado   |
| Usuários                                                      |         1         |     1     |     3     |        10         |   Ilimitado   |
| Storage                                                       |      100 MB       |   5 GB    |   25 GB   |      100 GB       |    Custom     |
| Documentos IA/mês                                             |         3         |    30     |    150    |        500        |   Ilimitado   |
| **Geração de documentos IA**                                  |                   |           |           |                   |               |
| Memorial descritivo                                           |         ✓         |     ✓     |     ✓     |         ✓         |       ✓       |
| Caderno especificações                                        |         ✓         |     ✓     |     ✓     |         ✓         |       ✓       |
| Proposta + Contrato base                                      |  ✓ marca d'água   |     ✓     |     ✓     |         ✓         |       ✓       |
| Briefing + Aditivos                                           |         —         |     ✓     |     ✓     |         ✓         |       ✓       |
| Memoriais técnicos (estrutural/hidrossanitário/elétrico/PPCI) |         —         |     ✓     |     ✓     |         ✓         |       ✓       |
| ART/RRT preenchida                                            |         —         |     ✓     |     ✓     |         ✓         |       ✓       |
| Análise NBR + zoneamento                                      |     ✓ básico      |     ✓     |     ✓     |         ✓         |       ✓       |
| Templates contrato CAU                                        |     1 modelo      | 3 modelos | 6 (todos) |     6 (todos)     |   6 (todos)   |
| **Orçamento e Quantitativo**                                  |                   |           |           |                   |               |
| Orçamento SINAPI                                              | Ferramenta grátis |     ✓     |     ✓     |         ✓         |       ✓       |
| Curva ABC + BDI custom                                        |         —         |     ✓     |     ✓     |         ✓         |       ✓       |
| **Quantitativo IA da planta** 🆕                              |         —         |     —     |     ✓     |         ✓         |       ✓       |
| Cotação de fornecedor (PDF/XLSX)                              |         —         |     —     |     ✓     |         ✓         |       ✓       |
| **Portal do cliente**                                         |                   |           |           |                   |               |
| Portal + assinatura digital                                   |         —         |     ✓     |     ✓     |         ✓         |       ✓       |
| Chat da planta (IA)                                           |         —         |     —     |     ✓     |         ✓         |       ✓       |
| **Notificações ao cliente**                                   |                   |           |           |                   |               |
| E-mail (Resend)                                               |         —         |     ✓     |     ✓     |         ✓         |       ✓       |
| **WhatsApp (Z-API)** 🆕                                       |         —         |     —     |     ✓     |         ✓         |       ✓       |
| **Obra**                                                      |                   |           |           |                   |               |
| **Diário de obra com fotos** 🆕                               |         —         |     —     |     ✓     |         ✓         |       ✓       |
| **Portfólio público `/p/<slug>`** 🆕                          |         —         |     ✓     |     ✓     | ✓ branding custom | ✓ white-label |
| **Multi-user**                                                |                   |           |           |                   |               |
| Convite de membros                                            |         —         |     —     | 2 extras  |      até 10       |     Ilim.     |
| **Revisão hierárquica multi-user** 🆕                         |         —         |     —     |     —     |         ✓         |       ✓       |
| **Biblioteca de templates da org** 🆕                         |         —         |     —     |     ✓     |         ✓         |       ✓       |
| **Branding**                                                  |                   |           |           |                   |               |
| Sem marca d'água                                              |         —         |     ✓     |     ✓     |         ✓         |       ✓       |
| Logo + cor primária + cor secundária                          |         —         |     ✓     |     ✓     |         ✓         |       ✓       |
| White-label (esconder Memorial.ai/Prumai)                     |         —         |     —     |     —     |         —         |       ✓       |
| **Suporte**                                                   |                   |           |           |                   |               |
| Comunidade (Discord/fórum)                                    |         ✓         |     ✓     |     ✓     |         ✓         |       ✓       |
| E-mail                                                        |         —         |    48h    |    24h    | Chat prioritário  |  Slack + SLA  |
| Onboarding dedicado                                           |         —         |     —     |     —     |     Assistido     | Personalizado |
| **API + Integrações**                                         |         —         |     —     |     —     |   ✓ (read-only)   |  ✓ completa   |
| **Multi-org / White-label**                                   |         —         |     —     |     —     |         —         |       ✓       |

🆕 = feature nova de P5-P11 que ainda **não estava no plano hoje**.

### 2.3 Ciclos de cobrança

| Ciclo                 | Desconto | Método                         | Recorrência                           |
| --------------------- | -------- | ------------------------------ | ------------------------------------- |
| **Mensal**            | —        | Cartão recorrente (Asaas)      | Cobra dia da assinatura               |
| **Anual**             | **-20%** | Cartão recorrente OU PIX único | Renova anualmente                     |
| **PIX à vista anual** | **-25%** | PIX único                      | Sem renovação automática — avisa D-30 |

**Por que essas 3 só** (não trimestral/semestral): Conta Azul oferece trimestral e quase ninguém usa. Fragmenta UI/billing sem ROI. Mensal = fluxo; Anual = compromisso; PIX-anual = cashflow + lealdade.

### 2.4 Trial

- **7 dias do Pro grátis sem cartão** — manter (já em prod desde P7)
- Após trial sem upgrade → vira **Free automaticamente** (cron já implementado)
- Reminder D-1 (já em prod desde P8)
- **Experimentar 14d** em campanhas pagas via PostHog feature flag (medir conversão)

---

## 3. Mudanças no código necessárias

### 3.1 `lib/plans/limits.ts` — refactor completo

```ts
// IDs (rename: standard → solo, pro_max → studio)
export type PlanId = "free" | "solo" | "pro" | "studio" | "agency";

// Novo campo PlanLimits
export type PlanLimits = {
  // existentes
  maxActiveProjects: number | null;
  monthlyAiDocs: number | null;
  maxUsers: number | null;
  watermarkOnExport: boolean;
  portalClienteEnabled: boolean;
  brandingCustom: boolean;
  prioritySupport: boolean;
  apiAccess: boolean;
  // NOVOS — features gated
  quantitativoIa: boolean;        // Pro+
  diarioObra: boolean;            // Pro+
  whatsappEnabled: boolean;       // Pro+
  portfolioPublico: boolean;      // Solo+
  bibliotecaTemplates: boolean;   // Pro+
  revisaoHierarquica: boolean;    // Studio+
  templatesContratoMax: number | null; // Free=1, Solo=3, Pro+=null (6)
  cotacaoFornecedor: boolean;     // Pro+
  whiteLabel: boolean;            // Agency+
  storageBytes: number | null;    // em bytes; null = ilimitado
};

// Preços em centavos
free: priceCents = 0
solo: priceCents = 8990 (R$ 89,90)
pro: priceCents = 21990 (R$ 219,90)
studio: priceCents = 49990 (R$ 499,90)
agency: priceCents = null
```

### 3.2 Schema — coluna `subscriptions.cycle`

Migration nova `20260730000001_subscription_cycles.sql`:

```sql
alter table public.subscriptions
  add column if not exists cycle text not null default 'monthly'
  check (cycle in ('monthly', 'annual', 'pix_annual'));

create index if not exists idx_subscriptions_cycle
  on public.subscriptions(org_id, cycle, status);
```

`subscriptions.meta.discount_percent` armazena % aplicado (20 ou 25).

### 3.3 Actions — adicionar guards faltantes

| Arquivo                                                            | Mudança                                                                                             |
| ------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------- |
| `server/actions/invitations/invite-member.action.ts`               | **BUG FIX**: validar `maxUsers` antes de criar convite. Hoje deixa convidar infinito mesmo no Free. |
| `server/actions/extraction/extract.action.ts` (ou onde dispara v2) | Adicionar guard `quantitativoIa` — se false, usa v1 (sem quantitativos)                             |
| `server/actions/diary/*`                                           | Guard `diarioObra` — bloqueia criação se false                                                      |
| `server/actions/documents/send-to-portal.action.ts`                | Guard `whatsappEnabled` antes de disparar Z-API                                                     |
| `server/actions/templates/save-template.action.ts`                 | Guard `bibliotecaTemplates`                                                                         |
| `server/actions/documents/request-internal-review.action.ts`       | Guard `revisaoHierarquica`                                                                          |
| `server/actions/documents/generate.action.ts`                      | Guard `templatesContratoMax` no escolher template CAU                                               |
| `server/actions/billing/upgrade-plan.action.ts`                    | Aceitar `cycle` param + aplicar desconto                                                            |
| `server/actions/billing/start-trial.action.ts`                     | Já OK                                                                                               |

### 3.4 UI

| Arquivo                                             | Mudança                                                                                                             |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `app/(app)/billing/page.tsx`                        | 3 colunas adicionais: mensal/anual/PIX. Toggle radio.                                                               |
| `components/features/billing/PlanUpgradeButton.tsx` | Aceita cycle no payload                                                                                             |
| `components/features/landing/PricingTable.tsx`      | Mostrar 3 abas (mensal/anual/PIX). Highlight "Pro Mais popular"                                                     |
| `app/page.tsx`                                      | Hero atualizado: "A partir de R$ 89,90/mês" (era R$ 199,90)                                                         |
| `components/features/billing/StartTrialCard.tsx`    | Manter, mas valida com novos limites Pro                                                                            |
| **`UpgradeGate` component** (novo)                  | Modal/banner mostrado quando user tenta usar feature gated. CTA: "Disponível no Pro" + botão upgrade. Reutilizável. |

### 3.5 E-mails transacionais

- Atualizar todos os templates pra mencionar novos preços (`R$ 89,90` em vez de `R$ 199,90`)
- Adicionar email "Conversão para anual recomendada" (opcional, fase 2)

---

## 4. Plano de rollout

### 4.1 Grandfathering das contas atuais

Justo com early adopters:

| Conta atual                 | Tratamento                                                                                           |
| --------------------------- | ---------------------------------------------------------------------------------------------------- |
| Standard R$ 199,90 (mensal) | Mantém preço **por 12 meses**. Depois migra pra Solo R$ 89,90 (downgrade) OU Pro R$ 219,90 (upgrade) |
| Pro R$ 449,90               | Mantém preço por 12 meses. Depois migra pra Pro R$ 219,90 (downgrade automático — beneficiado)       |
| Pro Max R$ 699,90           | Mantém preço por 12 meses. Depois migra pra Studio R$ 499,90 (downgrade beneficiado)                 |
| Agência                     | Mantém contrato vigente                                                                              |
| Trial Pro ativo             | Continua trial normal, ao expirar vê grade nova                                                      |

Aviso por email 30d antes da migração: "Seu plano mudou de Pro Max pra Studio mas você continua com 10 usuários e funcionalidades — só ficou mais barato"

### 4.2 A/B test na landing

Antes de migrar todo mundo:

- 50% dos visitantes vê grade nova (Solo/Pro/Studio)
- 50% vê grade atual (Standard/Pro/Pro Max)
- Mede via PostHog: CTR no CTA, signup → trial → paid conversion
- Se nova ≥ atual em 30 dias → promove

### 4.3 Ordem de implementação

1. **Imediato** (1 commit): bug fix do `invite-member.action.ts` com `maxUsers` check. Tem brecha hoje.
2. **Commit principal** (escopo médio, ~4-6h):
   - Refactor `lib/plans/limits.ts` (novos planos + features)
   - Migration `subscription_cycles`
   - Adicionar todos os feature guards nas actions
   - Atualizar UI billing + landing
   - Componente `UpgradeGate` reusável
3. **Commit grandfathering** (~2h): script `scripts/grandfather-existing-accounts.ts` que marca todas as orgs ativas com `meta.grandfathered_until = now + 365d` e mantém preço atual via webhook custom.
4. **Commit copy + email** (~1h): atualizar todos os emails transacionais e copy da landing.
5. **A/B test** (1 semana): só ativa pra subset via PostHog flag.
6. **Cutover**: depois de 30 dias de A/B com métricas positivas, promove 100%.

### 4.4 Comunicação

- Post no blog: "Nova estrutura de planos — Memorial.ai mais acessível"
- Email pros usuários atuais explicando grandfathering
- Atualizar `/sobre` mencionando "começamos a R$ 89/mês"
- Tweet/LinkedIn anunciando mudança

---

## 5. Riscos e mitigação

| Risco                                            | Probabilidade | Impacto                              | Mitigação                                                                         |
| ------------------------------------------------ | ------------- | ------------------------------------ | --------------------------------------------------------------------------------- |
| Standard atual descontente com migração          | Média         | Médio                                | Grandfathering 12 meses + email cuidadoso                                         |
| Downgrade massivo (Pro Max → Studio mais barato) | Alta          | Baixo (já estávamos cobrando demais) | É positivo — clientes ficam felizes                                               |
| Free vira "demais grátis" e ninguém upgrade      | Baixa         | Alto                                 | Limites duros: 1 projeto, 3 docs/mês, sem portal. Já é restritivo.                |
| Conversão de trial cai com novos preços          | Baixa         | Médio                                | Trial continua testando Pro (R$ 219), valor percebido alto.                       |
| Concorrente reage baixando preço                 | Média         | Médio                                | Diferencial IA Claude + portal + portfolio + WhatsApp continua sustentando prêmio |

---

## 6. Justificativa rápida pra cada decisão

**Por que Solo R$ 89,90?** Abaixo de ARQProject (R$ 99), Vobi (R$ 103) e Projete Pro (R$ 99) — pra ser "mais barato que o competitor mais próximo". Acima de Projete Starter (R$ 59) e Plana 1 anual (R$ 64) — não quero corrida ao fundo. R$ 89 = "sweet spot psychological pricing".

**Por que Pro R$ 219,90?** Sweet spot do "profissional consolidado BR" (Conta Azul R$ 159, Projete Business R$ 199, Plana 3 R$ 189). R$ 219 captura quem já tá pagando R$ 200 em qualquer SaaS e dá margem extra pra Memorial.ai justificar pelo valor de IA.

**Por que Studio R$ 499,90?** Abaixo do Construflow Básico (R$ 699) que é o competidor pra escritório real. Acima de Projetolist Business (R$ 245). Sweet spot pra "estúdio de 3-8 pessoas".

**Por que -20% anual?** Padrão BR é 15-25%, 20% é a mediana segura. Plana faz 17-19%, Conta Azul ~20%, Notion 17%, Monograph 17%.

**Por que -25% PIX à vista?** 20% (anual) + 5pp extra de antecipação de caixa. Asaas suporta nativamente, sem fee de cartão. Diferencial real vs concorrentes (nenhum AEC mostra preço PIX transparente).

---

## 7. Próximos passos imediatos

Aguarda decisão do fundador:

- [ ] **Aprovar nomes**: Solo / Pro / Studio / Agência? Ou ajustar nomenclatura?
- [ ] **Aprovar preços**: R$ 89,90 / R$ 219,90 / R$ 499,90 ou ajustes finos?
- [ ] **Aprovar features-por-plano** conforme tabela 2.2?
- [ ] **Aprovar descontos**: 20% anual + 25% PIX?
- [ ] **Aprovar grandfathering**: 12 meses pros atuais?
- [ ] **Aprovar A/B test**: 30 dias antes de cutover total?

Se SIM em tudo → implemento em 4-6h espalhadas em 2-3 commits. Coordeno com o rebrand Prumai (Fase 8 do MIGRATION_CHECKLIST).

Se quiser ajustar → me passa as mudanças e ajusto a proposta.
