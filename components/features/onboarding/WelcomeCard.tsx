import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

/**
 * Card de boas-vindas mostrado quando o escritório ainda não tem projeto.
 * Lista o fluxo end-to-end em 4 passos para o usuário entender o produto
 * em 30s.
 */

const STEPS = [
  {
    n: 1,
    titulo: "Cadastre cliente + projeto",
    detalhe: "Nome, tipologia, endereço da obra e (opcional) cidade/zona pra validar zoneamento.",
  },
  {
    n: 2,
    titulo: "Suba a planta em PDF",
    detalhe:
      "A IA detecta ambientes, áreas e elementos especiais em ~1min. Você revisa e confirma.",
  },
  {
    n: 3,
    titulo: "Gere os documentos por IA",
    detalhe: "Memorial, caderno, proposta, contrato, cronograma, estrutural… 10 tipos prontos.",
  },
  {
    n: 4,
    titulo: "Envie ao cliente pelo portal",
    detalhe: "Cliente abre link único, lê, assina por desenho. Aprovação com IP + hash registrada.",
  },
];

export function WelcomeCard() {
  return (
    <Card>
      <CardContent className="space-y-6 p-6">
        <div>
          <p className="text-xs font-medium tracking-wider text-emerald-600 uppercase">
            Bem-vindo ao Memorial.ai
          </p>
          <h2 className="mt-2 text-xl font-semibold tracking-tight">
            Da planta ao contrato em horas, não semanas.
          </h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Em 4 passos você cobre todo o ciclo do projeto técnico:
          </p>
        </div>

        <ol className="space-y-3">
          {STEPS.map((step) => (
            <li key={step.n} className="flex gap-3">
              <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-xs font-semibold text-white dark:bg-zinc-100 dark:text-zinc-900">
                {step.n}
              </span>
              <div>
                <p className="text-sm font-medium">{step.titulo}</p>
                <p className="text-xs text-zinc-600 dark:text-zinc-400">{step.detalhe}</p>
              </div>
            </li>
          ))}
        </ol>

        <div className="flex flex-wrap gap-2 border-t border-zinc-200 pt-4 dark:border-zinc-800">
          <Link href="/clientes/novo" className={buttonVariants({ size: "sm" })}>
            Criar primeiro cliente
          </Link>
          <Link
            href="/projetos/novo"
            className={buttonVariants({ size: "sm", variant: "outline" })}
          >
            Criar projeto direto
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
