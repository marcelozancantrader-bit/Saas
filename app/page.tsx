import Link from "next/link";
import { redirect } from "next/navigation";
import { buttonVariants } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { Logo } from "@/components/brand/Logo";
import { RoiCalculator } from "@/components/features/landing/RoiCalculator";
import { ComparisonTable } from "@/components/features/landing/ComparisonTable";
import { GuaranteeBadge } from "@/components/features/landing/GuaranteeBadge";
import { SocialProof } from "@/components/features/landing/SocialProof";
import { PricingTable } from "@/components/features/landing/PricingTable";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Memorial.ai — Memorial técnico em minutos, não semanas",
  description:
    "Copiloto de IA para arquitetos e engenheiros: extração de planta, 10 documentos técnicos por IA, orçamento SINAPI automático e portal do cliente com assinatura digital. Plano Free sem cartão.",
};

const DORES = [
  {
    titulo: "Memorial descritivo",
    tempo: "8h → 15min",
    antes: "Você copia do projeto anterior, edita campo por campo, esquece referências de NBR.",
    depois:
      "IA gera memorial novo a partir da extração da planta, citando NBR 12.722/15.575/16.401 conforme o caso.",
  },
  {
    titulo: "Orçamento SINAPI",
    tempo: "1 semana → 1 min",
    antes: "Você abre a planilha SINAPI da Caixa, calcula quantitativos no Excel, aplica BDI.",
    depois:
      "Regras heurísticas leem a extração e geram 30+ itens prontos com preço SINAPI do mês, BDI e curva ABC.",
  },
  {
    titulo: "Memoriais técnicos por disciplina",
    tempo: "4-6h cada → 20min",
    antes: "Cada projeto complementar exige releitura da planta e novo memorial do zero.",
    depois:
      "Sobe o PDF da disciplina (elétrica, hidráulica, estrutural, gás, HVAC). IA extrai dados específicos e gera o memorial.",
  },
  {
    titulo: "Aprovação do cliente",
    tempo: "Risco jurídico → Prova legal",
    antes: "Cliente aprova por WhatsApp e depois nega. Sem prova, sem aditivo, prejuízo.",
    depois:
      "Portal único com assinatura digital. IP, timestamp, hash do documento — compliant com MP 2.200-2.",
  },
  {
    titulo: "Alteração de escopo",
    tempo: "5-15% do contrato → 0",
    antes: 'Cliente pede mudança toda semana e absorve o custo no "de favor".',
    depois:
      "Portal formaliza: cliente solicita, você precifica, cliente assina aditivo. Soma ao contrato.",
  },
  {
    titulo: "ART/RRT",
    tempo: "1-2h → 5min",
    antes: "Preenche os campos manualmente, copiando dados do cadastro do cliente.",
    depois:
      "Pré-preenchimento automático com dados do CAU/CREA, cliente e projeto. Você só revisa e exporta.",
  },
];

const COMO_FUNCIONA = [
  {
    passo: "1",
    titulo: "Sobe a planta em PDF",
    descricao:
      "Arquitetônica, elétrica, hidráulica, estrutural, gás ou HVAC. Até 50 MB cada. Escolhe a disciplina e o resto é automático.",
  },
  {
    passo: "2",
    titulo: "IA extrai os dados em 60 segundos",
    descricao:
      "Claude Sonnet 4.6 lê o PDF e devolve áreas por ambiente, padrão construtivo, elementos especiais, circuitos, pontos de água, vigas, BTU dos splits, etc.",
  },
  {
    passo: "3",
    titulo: "Você revisa e confirma",
    descricao:
      "A IA mostra a confiança da extração e os campos editáveis. Em ~2 minutos você confirma e libera todo o resto.",
  },
  {
    passo: "4",
    titulo: "Documentos e orçamento prontos",
    descricao:
      "Memorial, caderno técnico, proposta, contrato, cronograma e orçamento SINAPI saem em PDF com a sua marca. Cliente recebe link e assina digitalmente.",
  },
];

const FUNCIONALIDADES = [
  {
    titulo: "Extração IA multi-disciplina",
    descricao:
      "6 disciplinas: arquitetônica, elétrica, hidrossanitária, estrutural, gás, climatização.",
  },
  {
    titulo: "10 documentos técnicos",
    descricao:
      "Memorial descritivo, estrutural, hidrossanitário, elétrico, PPCI, impermeabilização, caderno, proposta, contrato, cronograma.",
  },
  {
    titulo: "Orçamento SINAPI",
    descricao:
      "Composição automática, preço do mês corrente, BDI configurável, breakdown por disciplina e curva ABC.",
  },
  {
    titulo: "Análise NBR",
    descricao:
      "Verificações automáticas contra NBR 12.722 e 15.575: pé-direito, áreas mínimas, ventilação.",
  },
  {
    titulo: "Zoneamento universal",
    descricao:
      "5 capitais curadas (Curitiba/SP/POA/RJ/BH) + IA pra qualquer cidade BR. Valida CA, TO, altura, vagas.",
  },
  {
    titulo: "ART/RRT pré-preenchida",
    descricao: "Form pronto pra exportação, com dados do CAU/CREA, cliente e obra já populados.",
  },
  {
    titulo: "Portal do cliente",
    descricao:
      "URL única por cliente. Sem login. Cliente lê doc, assina no canvas, fica prova legal.",
  },
  {
    titulo: "Alteração de escopo formal",
    descricao:
      "Cliente solicita → você precifica → cliente assina aditivo. Soma ao contrato automático.",
  },
  {
    titulo: "Chat da planta (cliente)",
    descricao:
      "Bot dentro do portal que responde dúvidas do cliente sobre o projeto. Custa centavos por pergunta.",
  },
  {
    titulo: "Branding completo",
    descricao:
      "Logo, cores e dados de contato do escritório aparecem em todos os PDFs e no portal.",
  },
  {
    titulo: "Conformidade LGPD",
    descricao:
      "Export de dados em JSON, exclusão de conta cascata, audit log imutável de toda decisão sensível.",
  },
  {
    titulo: "Cobrança via PIX",
    descricao:
      "Integração Asaas: assinatura recorrente, sem fees de cartão, sem retorno de boleto.",
  },
];

const FAQ = [
  {
    q: "A IA substitui o profissional?",
    a: "Não. Todo documento sai com disclaimer de revisão técnica obrigatória e responsabilidade do profissional emissor. A ferramenta acelera; a responsabilidade é sua.",
  },
  {
    q: "Quanto custa pra rodar?",
    a: "Plano Free é gratuito (2 projetos, 3 docs/mês). Standard a R$ 199,90/mês cobre o autônomo médio. Pro a R$ 449,90 para volume maior. Veja os planos em detalhe acima.",
  },
  {
    q: "Funciona com plantas escaneadas / fotos?",
    a: "Funciona com PDFs nítidos (idealmente exportados do AutoCAD/Revit). Plantas escaneadas com baixa resolução têm extração de menor confiança — a IA sinaliza isso pra você revisar com cuidado.",
  },
  {
    q: "Os preços SINAPI são atualizados?",
    a: "Sim. Job mensal puxa SINAPI oficial da Caixa. Versões desonerada e não-desonerada disponíveis. Você escolhe UF + mês de referência.",
  },
  {
    q: "E se eu cancelar?",
    a: "Cancela a qualquer momento dentro do app. Seus dados ficam disponíveis para download em JSON (LGPD art. 18). Exclusão definitiva é via botão na tela de Configurações.",
  },
  {
    q: "Tem integração com Revit / AutoCAD?",
    a: "Hoje aceitamos PDF (qualquer software exporta). API pública e integração nativa com Revit estão no roadmap — sem data fechada ainda. Se for crítico, fale com a gente em suporte@memorial.ai.",
  },
  {
    q: "O documento gerado tem valor jurídico?",
    a: "O conteúdo técnico fica sob sua responsabilidade profissional (ART/RRT). A assinatura digital do cliente no portal segue MP 2.200-2/2001 (ICP-Brasil) com IP, timestamp e hash, tornando-se prova legal em caso de disputa.",
  },
  {
    q: "Meus clientes precisam criar conta?",
    a: "Não. Você envia um link único por cliente (URL com token UUID); o cliente acessa, lê, assina e aprova sem nenhum cadastro. Funciona em qualquer celular.",
  },
];

export default async function HomePage() {
  // Se já estiver logado, vai direto pro dashboard.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/dashboard");

  return (
    <main className="min-h-screen bg-white text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50">
      {/* ====== HEADER ====== */}
      <header className="sticky top-0 z-30 border-b border-zinc-200 bg-white/80 backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-950/80">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <Link href="/" aria-label="Memorial.ai" className="inline-flex items-center gap-2">
            <Logo size={28} />
            <span className="text-base font-semibold">Memorial.ai</span>
          </Link>
          <nav className="flex items-center gap-2 sm:gap-4">
            <a
              href="#funcionalidades"
              className="hidden text-base text-zinc-700 hover:text-zinc-900 sm:block dark:text-zinc-300 dark:hover:text-zinc-50"
            >
              Funcionalidades
            </a>
            <a
              href="#planos"
              className="hidden text-base text-zinc-700 hover:text-zinc-900 sm:block dark:text-zinc-300 dark:hover:text-zinc-50"
            >
              Planos
            </a>
            <Link
              href="/sobre"
              className="hidden text-base text-zinc-700 hover:text-zinc-900 sm:block dark:text-zinc-300 dark:hover:text-zinc-50"
            >
              Sobre
            </Link>
            <a
              href="#faq"
              className="hidden text-base text-zinc-700 hover:text-zinc-900 sm:block dark:text-zinc-300 dark:hover:text-zinc-50"
            >
              FAQ
            </a>
            <Link
              href="/login"
              className="text-base text-zinc-700 underline-offset-2 hover:underline dark:text-zinc-300"
            >
              Entrar
            </Link>
            <Link href="/signup" className={buttonVariants()}>
              Começar grátis
            </Link>
          </nav>
        </div>
      </header>

      {/* ====== HERO ====== */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-br from-blue-50 via-white to-white dark:from-blue-950/30 dark:via-zinc-950 dark:to-zinc-950" />
        <div className="mx-auto max-w-5xl px-4 py-16 text-center sm:px-6 lg:py-24">
          <p className="text-sm tracking-wider text-blue-700 uppercase dark:text-blue-400">
            Para arquitetos e engenheiros civis · BR
          </p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
            Memorial técnico em <span className="text-blue-600 dark:text-blue-400">minutos</span>.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-zinc-600 sm:text-xl dark:text-zinc-400">
            Da planta ao contrato em uma sessão de trabalho. IA extrai a planta, gera{" "}
            <strong>10 documentos técnicos</strong>, monta orçamento SINAPI e o cliente assina pelo
            portal.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link href="/signup" className={buttonVariants({ size: "lg" })}>
              Criar conta grátis →
            </Link>
            <a href="#como-funciona" className={buttonVariants({ size: "lg", variant: "outline" })}>
              Ver como funciona
            </a>
          </div>
          <p className="mt-4 text-sm text-zinc-500">
            2 projetos e 3 docs IA grátis. Sem cartão de crédito. Sem fidelidade.
          </p>

          <div className="mt-12">
            <SocialProof />
          </div>

          {/* Métricas */}
          <div className="mx-auto mt-10 grid max-w-3xl grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { v: "31h", l: "economizadas por projeto" },
              { v: "10", l: "documentos por IA" },
              { v: "6", l: "disciplinas extraídas" },
              { v: "60s", l: "extração da planta" },
            ].map((m) => (
              <div
                key={m.l}
                className="rounded-lg border border-zinc-200 bg-white p-4 text-center dark:border-zinc-800 dark:bg-zinc-900"
              >
                <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{m.v}</p>
                <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{m.l}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ====== COMO FUNCIONA ====== */}
      <section
        id="como-funciona"
        className="border-y border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/40"
      >
        <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
          <div className="text-center">
            <p className="text-sm tracking-wider text-blue-700 uppercase dark:text-blue-400">
              Em 4 passos
            </p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Como funciona</h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg leading-relaxed text-zinc-600 dark:text-zinc-400">
              Do upload do PDF ao contrato assinado. Tudo em uma plataforma, sem alternar entre
              Excel, Word, AutoCAD e WhatsApp.
            </p>
          </div>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {COMO_FUNCIONA.map((p) => (
              <div
                key={p.passo}
                className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-lg font-bold text-white">
                  {p.passo}
                </div>
                <h3 className="mt-4 text-lg font-semibold">{p.titulo}</h3>
                <p className="mt-2 text-base leading-relaxed text-zinc-600 dark:text-zinc-400">
                  {p.descricao}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ====== COMPARISON ====== */}
      <ComparisonTable />

      {/* ====== DORES ====== */}
      <section className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
        <div className="text-center">
          <p className="text-sm tracking-wider text-blue-700 uppercase dark:text-blue-400">
            Onde você perde mais tempo
          </p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
            O que a IA resolve no detalhe
          </h2>
        </div>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {DORES.map((d) => (
            <div
              key={d.titulo}
              className="flex flex-col rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900"
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-lg font-semibold">{d.titulo}</h3>
                <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-sm font-medium text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">
                  {d.tempo}
                </span>
              </div>
              <p className="mt-4 text-base leading-relaxed text-zinc-500 italic dark:text-zinc-500">
                &ldquo;{d.antes}&rdquo;
              </p>
              <p className="mt-3 text-base leading-relaxed text-zinc-700 dark:text-zinc-300">
                <span className="font-medium text-blue-600 dark:text-blue-400">→</span> {d.depois}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ====== ROI INTERACTIVE ====== */}
      <section className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
        <RoiCalculator />
      </section>

      {/* ====== FUNCIONALIDADES ====== */}
      <section
        id="funcionalidades"
        className="border-y border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/40"
      >
        <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
          <div className="text-center">
            <p className="text-sm tracking-wider text-blue-700 uppercase dark:text-blue-400">
              Tudo em uma plataforma
            </p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Funcionalidades</h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg leading-relaxed text-zinc-600 dark:text-zinc-400">
              12 features cobrindo todo o fluxo: da extração à cobrança do cliente.
            </p>
          </div>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FUNCIONALIDADES.map((f) => (
              <div
                key={f.titulo}
                className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
              >
                <h3 className="text-base font-semibold text-blue-700 dark:text-blue-400">
                  {f.titulo}
                </h3>
                <p className="mt-2 text-base leading-relaxed text-zinc-600 dark:text-zinc-400">
                  {f.descricao}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ====== GUARANTEE BADGES ====== */}
      <GuaranteeBadge />

      {/* ====== PRICING TABLE COM FEATURE MATRIX ====== */}
      <PricingTable />

      {/* ====== FAQ ====== */}
      <section id="faq" className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <div className="text-center">
          <p className="text-sm tracking-wider text-blue-700 uppercase dark:text-blue-400">
            Perguntas frequentes
          </p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">FAQ</h2>
        </div>
        <div className="mt-10 space-y-4">
          {FAQ.map((item) => (
            <details
              key={item.q}
              className="group rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
            >
              <summary className="flex cursor-pointer items-center justify-between gap-3 text-lg font-medium">
                {item.q}
                <span className="text-2xl text-blue-600 transition-transform group-open:rotate-45 dark:text-blue-400">
                  +
                </span>
              </summary>
              <p className="mt-4 text-base leading-relaxed text-zinc-600 dark:text-zinc-400">
                {item.a}
              </p>
            </details>
          ))}
        </div>
        <p className="mt-8 text-center text-sm text-zinc-500">
          Outra dúvida?{" "}
          <a
            href="mailto:suporte@memorial.ai"
            className="text-blue-700 hover:underline dark:text-blue-400"
          >
            suporte@memorial.ai
          </a>{" "}
          — respondemos em até 1 dia útil.
        </p>
      </section>

      {/* ====== CTA FINAL ====== */}
      <section className="border-t border-zinc-200 bg-gradient-to-br from-blue-600 to-blue-800 text-white dark:border-zinc-800">
        <div className="mx-auto max-w-4xl px-4 py-16 text-center sm:px-6">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Pronto para reduzir 31 horas por projeto?
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg leading-relaxed text-blue-100">
            Comece grátis. Dois projetos completos pra testar tudo — incluindo extração de planta,
            geração de documentos e portal do cliente. Sem cartão de crédito.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/signup"
              className="rounded-md bg-white px-6 py-3 text-base font-medium text-blue-700 transition hover:bg-blue-50"
            >
              Criar conta grátis →
            </Link>
            <Link
              href="/login"
              className="rounded-md border border-white/30 px-6 py-3 text-base font-medium text-white transition hover:bg-white/10"
            >
              Já tenho conta
            </Link>
          </div>
        </div>
      </section>

      {/* ====== FOOTER ====== */}
      <footer className="border-t border-zinc-200 dark:border-zinc-800">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex items-center gap-2">
            <Logo size={20} />
            <span className="text-base font-semibold">Memorial.ai</span>
            <span className="text-sm text-zinc-500">© 2026</span>
          </div>
          <div className="flex flex-wrap gap-4 text-sm text-zinc-500">
            <Link href="/sobre" className="hover:underline">
              Sobre
            </Link>
            <Link href="/privacidade" className="hover:underline">
              Privacidade
            </Link>
            <Link href="/termos" className="hover:underline">
              Termos
            </Link>
            <a href="mailto:suporte@memorial.ai" className="hover:underline">
              suporte@memorial.ai
            </a>
            <Link href="/login" className="hover:underline">
              Entrar
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
