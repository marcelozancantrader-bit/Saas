import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { PLANS, formatBrlFromCents } from "@/lib/plans/limits";

export const metadata = {
  title: "Memorial.ai — Da planta ao contrato em horas, não semanas",
  description:
    "Copiloto documental para arquitetos e engenheiros civis brasileiros. Extração de planta por IA, orçamento SINAPI automático, documentos técnicos gerados em minutos, portal do cliente com aprovação digital.",
};

const DORES = [
  {
    titulo: "Memorial descritivo",
    antes: '"Copio do projeto anterior e edito por 2 horas."',
    depois: "Memorial 100% novo em 3-5min com base na planta confirmada.",
  },
  {
    titulo: "Orçamento",
    antes: '"3 dias batendo planilha SINAPI item por item."',
    depois: "Orçamento composto em <1min, BDI já incluso, R$/m² calculado.",
  },
  {
    titulo: "Aprovação do cliente",
    antes: '"WhatsApp, e-mail, ligação. Cliente nega ter aprovado depois."',
    depois: "Portal único com assinatura por desenho. IP, hora, hash do documento — prova legal.",
  },
  {
    titulo: "Alteração de escopo",
    antes: '"Cliente pede mudança toda semana e eu não cobro aditivo."',
    depois:
      "Cliente solicita pelo portal. Você define valor e prazo. Cliente assina. Vira aditivo formal.",
  },
];

export default function SobrePage() {
  return (
    <main className="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50">
      <header className="border-b border-zinc-200 dark:border-zinc-800">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
          <Link href="/sobre" className="text-lg font-semibold tracking-tight">
            Memorial.ai
          </Link>
          <nav className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm text-zinc-700 underline-offset-2 hover:underline dark:text-zinc-300"
            >
              Entrar
            </Link>
            <Link href="/signup" className={buttonVariants({ size: "sm" })}>
              Começar grátis
            </Link>
          </nav>
        </div>
      </header>

      <section className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6 lg:py-24">
        <p className="text-xs tracking-wider text-zinc-500 uppercase">
          Para arquitetos e engenheiros civis no Brasil
        </p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">
          Da planta ao contrato em <span className="text-zinc-500">horas</span>, não semanas.
        </h1>
        <p className="mt-5 text-lg text-zinc-600 dark:text-zinc-400">
          Memorial descritivo, orçamento SINAPI, proposta e contrato gerados pela IA com seus dados.
          Cliente aprova com assinatura digital. Você fecha o ciclo em uma sessão de trabalho.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <Link href="/signup" className={buttonVariants({ size: "lg" })}>
            Criar conta grátis
          </Link>
          <Link href="/login" className={buttonVariants({ size: "lg", variant: "outline" })}>
            Já uso
          </Link>
        </div>
        <p className="mt-3 text-xs text-zinc-500">
          Plano Free com 2 projetos e 5 documentos IA por mês. Sem cartão.
        </p>
      </section>

      <section className="border-y border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
          <h2 className="text-2xl font-semibold tracking-tight">
            O que você gastava 3 dias para fazer
          </h2>
          <div className="mt-8 space-y-6">
            {DORES.map((d) => (
              <div
                key={d.titulo}
                className="rounded-lg border border-zinc-200 p-5 dark:border-zinc-800"
              >
                <p className="text-sm font-medium tracking-wider text-zinc-500 uppercase">
                  {d.titulo}
                </p>
                <p className="mt-2 text-sm text-zinc-600 italic dark:text-zinc-400">{d.antes}</p>
                <p className="mt-2 text-base">→ {d.depois}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <h2 className="text-2xl font-semibold tracking-tight">Planos</h2>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Comece grátis. Faça upgrade quando o ritmo do seu escritório justificar.
        </p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {(["free", "pro", "studio", "agency"] as const).map((id) => {
            const p = PLANS[id];
            return (
              <div
                key={id}
                className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
              >
                <p className="text-base font-semibold">{p.label}</p>
                <p className="mt-1 text-2xl font-semibold">
                  {formatBrlFromCents(p.priceCents)}
                  {p.priceCents !== null && p.priceCents > 0 ? (
                    <span className="ml-1 text-xs font-normal text-zinc-500">/mês</span>
                  ) : null}
                </p>
                <ul className="mt-3 space-y-1 text-xs text-zinc-600 dark:text-zinc-400">
                  {p.features.map((f) => (
                    <li key={f} className="flex gap-1.5">
                      <span aria-hidden>•</span>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </section>

      <footer className="border-t border-zinc-200 dark:border-zinc-800">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-6 text-xs text-zinc-500 sm:px-6">
          <p>© 2026 Memorial.ai</p>
          <div className="flex gap-4">
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
