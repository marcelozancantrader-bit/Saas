import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Logo } from "@/components/brand/Logo";
import { Sparkles, Heart, Code, ShieldCheck } from "lucide-react";

export const metadata = {
  title: "Sobre · Memorial.ai",
  description:
    "Quem está por trás do Memorial.ai e por que o produto existe — uma plataforma feita pra acelerar o trabalho documental de arquitetos e engenheiros brasileiros.",
};

const VALORES = [
  {
    icon: Sparkles,
    title: "Resolver problema, não vender feature",
    body: "Cada feature do Memorial.ai existe porque um arquiteto ou engenheiro real perdeu horas com aquilo. A IA acelera o que repete; você responde pelo que decide.",
  },
  {
    icon: Heart,
    title: "Founder responde direto",
    body: 'Não tem fila de tickets, bot terceirizado ou "primeiro nível". Cada e-mail e cada WhatsApp chega no fundador. Feedback vira código no mesmo dia.',
  },
  {
    icon: Code,
    title: "Construído na frente do cliente",
    body: "Roadmap público, deploys diários, changelog em prosa simples. Você sabe o que está vindo, quando vem e por quê.",
  },
  {
    icon: ShieldCheck,
    title: "Responsabilidade técnica é sua",
    body: "Todo documento sai com disclaimer de revisão obrigatória. A ferramenta gera; você assina. Conformidade LGPD, MP 2.200-2 e audit log imutável são padrão.",
  },
];

export default function SobrePage() {
  return (
    <main className="min-h-screen bg-white text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50">
      <header className="sticky top-0 z-30 border-b border-zinc-200 bg-white/80 backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-950/80">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <Link href="/" aria-label="Memorial.ai" className="inline-flex items-center gap-2">
            <Logo size={28} />
            <span className="text-base font-semibold">Memorial.ai</span>
          </Link>
          <nav className="flex items-center gap-3 text-sm">
            <Link href="/#planos" className="text-zinc-700 hover:underline dark:text-zinc-300">
              Planos
            </Link>
            <Link href="/login" className="text-zinc-700 hover:underline dark:text-zinc-300">
              Entrar
            </Link>
            <Link href="/signup" className={buttonVariants({ size: "sm" })}>
              Criar conta
            </Link>
          </nav>
        </div>
      </header>

      <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <p className="text-xs tracking-wider text-blue-700 uppercase dark:text-blue-400">Sobre</p>
        <h1 className="mt-2 text-4xl font-bold tracking-tight sm:text-5xl">
          Feito pra quem assina o projeto.
        </h1>
        <p className="mt-6 text-lg leading-relaxed text-zinc-700 dark:text-zinc-300">
          Memorial.ai nasceu da frustração de ver arquitetos e engenheiros queimando dias inteiros
          em trabalho que IA + automação resolve em minutos. O profissional fica preso digitando
          memorial descritivo, recalculando orçamento SINAPI, formatando proposta, copiando ART
          campo por campo — quando deveria estar projetando, captando cliente, ou descansando.
        </p>
        <p className="mt-4 text-lg leading-relaxed text-zinc-700 dark:text-zinc-300">
          A premissa é simples:{" "}
          <strong>
            a IA não substitui o profissional, mas devolve as 31 horas/projeto que ele perdia em
            tarefa documental
          </strong>
          . O que sobra é tempo pra fazer o que realmente vale: projetar bem, conversar com cliente,
          revisar memorial com olho técnico — não digitar do zero.
        </p>

        <div className="mt-12 rounded-2xl border border-blue-200 bg-blue-50 p-6 dark:border-blue-900/50 dark:bg-blue-950/30">
          <h2 className="text-xl font-bold">Por que existimos</h2>
          <p className="mt-3 text-base leading-relaxed text-zinc-700 dark:text-zinc-300">
            Engenheiro civil amigo do fundador estava cobrando R$ 4.500 por um projeto residencial
            de 120m² e gastando 4 dias só no documental. Cliente atrasou pagamento porque &ldquo;não
            entendi o orçamento&rdquo;, aprovou por WhatsApp e depois pediu mudança alegando
            &ldquo;nunca concordei com isso&rdquo;. Aditivo perdido. Trabalho refeito. Margem
            evaporada.
          </p>
          <p className="mt-3 text-base leading-relaxed text-zinc-700 dark:text-zinc-300">
            <strong>A história se repete em milhares de escritórios pequenos no Brasil</strong> — e
            a tecnologia pra resolver isso já existe. Faltava juntar tudo num produto pensado pra
            fluxo BR (SINAPI, CAU/CREA, LGPD, MP 2.200-2, NBR) e cobrar um preço justo.
          </p>
        </div>

        <h2 className="mt-12 text-2xl font-bold">Nossos princípios</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {VALORES.map((v) => {
            const Icon = v.icon;
            return (
              <div
                key={v.title}
                className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
              >
                <Icon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                <h3 className="mt-3 text-base font-semibold">{v.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                  {v.body}
                </p>
              </div>
            );
          })}
        </div>

        <h2 className="mt-12 text-2xl font-bold">Tech stack</h2>
        <p className="mt-4 text-base leading-relaxed text-zinc-700 dark:text-zinc-300">
          Next.js 16, Supabase (Postgres + Auth + Storage + RLS), Anthropic Claude Sonnet 4.6 pra
          extração e geração, Inngest pra jobs assíncronos, Asaas pra cobrança PIX. Hospedagem
          Vercel, dados em São Paulo (sa-east-1). Stack escolhida pra ser veloz, segura e barata de
          escalar.
        </p>

        <h2 className="mt-12 text-2xl font-bold">Quer conversar?</h2>
        <p className="mt-4 text-base leading-relaxed text-zinc-700 dark:text-zinc-300">
          Founder responde pessoalmente em{" "}
          <a
            href="mailto:contato@memorial.ai"
            className="text-blue-700 hover:underline dark:text-blue-400"
          >
            contato@memorial.ai
          </a>
          . Bug urgente, feedback, parceria — manda. Resposta em até 1 dia útil.
        </p>

        <div className="mt-12 flex flex-wrap gap-3">
          <Link href="/signup" className={buttonVariants({ size: "lg" })}>
            Criar conta grátis →
          </Link>
          <Link href="/" className={buttonVariants({ size: "lg", variant: "outline" })}>
            Voltar pra home
          </Link>
        </div>
      </section>

      <footer className="border-t border-zinc-200 dark:border-zinc-800">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex items-center gap-2">
            <Logo size={20} />
            <span className="text-base font-semibold">Memorial.ai</span>
            <span className="text-sm text-zinc-500">© 2026</span>
          </div>
          <div className="flex flex-wrap gap-4 text-sm text-zinc-500">
            <Link href="/privacidade" className="hover:underline">
              Privacidade
            </Link>
            <Link href="/termos" className="hover:underline">
              Termos
            </Link>
            <a href="mailto:suporte@memorial.ai" className="hover:underline">
              suporte@memorial.ai
            </a>
          </div>
        </div>
      </footer>
    </main>
  );
}
