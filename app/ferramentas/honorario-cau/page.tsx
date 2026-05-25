import Link from "next/link";
import { HonorarioCauCalculator } from "@/components/features/ferramentas/HonorarioCauCalculator";
import { buttonVariants } from "@/components/ui/button";

export const revalidate = 86400;

export const metadata = {
  title: "Calculadora de honorário CAU — Memorial.ai",
  description:
    "Calcule o honorário sugerido pra projeto de arquitetura no Brasil baseado na tabela CAU/BR. Informe área, padrão e escopo. Resultado em segundos, sem cadastro.",
};

export default function HonorarioCauPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <div>
        <Link href="/ferramentas" className="text-sm text-zinc-500 hover:underline">
          ← Todas as ferramentas
        </Link>
        <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
          Calculadora de honorário arquitetônico
        </h1>
        <p className="mt-3 text-base text-zinc-600 dark:text-zinc-400">
          Estimativa baseada na <strong>tabela CAU/BR</strong> (Resolução 67/2013 + 91/2014). O
          honorário é calculado como percentual sobre o custo da obra (CUB × área × padrão).
          Resultado é referencial — você ajusta no contrato real com base em escopo, prazo e
          complexidade.
        </p>
      </div>

      <div className="mt-8">
        <HonorarioCauCalculator />
      </div>

      <div className="mt-8 rounded-lg border border-blue-200 bg-blue-50/50 p-4 text-sm dark:border-blue-900/40 dark:bg-blue-950/20">
        <p className="font-semibold text-blue-900 dark:text-blue-100">Como o cálculo é feito</p>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-zinc-700 dark:text-zinc-300">
          <li>
            <strong>Custo da obra estimado</strong> = área × CUB médio por padrão construtivo
          </li>
          <li>
            <strong>% honorário</strong> conforme escopo: Projeto Legal (5–8%), Projeto Completo
            (8–12%), Projeto + Acompanhamento RT (10–15%)
          </li>
          <li>
            <strong>Honorário sugerido</strong> = custo × % escolhido. Faixa min–max mostra a
            negociação típica.
          </li>
        </ol>
      </div>

      <div className="mt-8 rounded-xl border border-blue-200 bg-gradient-to-br from-blue-50 to-white p-6 text-center dark:border-blue-900/50 dark:from-blue-950/30 dark:to-zinc-900">
        <h2 className="text-lg font-semibold">
          Quer gerar a proposta + contrato com esse honorário em 5 minutos?
        </h2>
        <p className="mx-auto mt-2 max-w-xl text-sm text-zinc-600 dark:text-zinc-400">
          O Memorial.ai gera proposta comercial visual + contrato baseado em 6 templates CAU/BR
          (Residencial PF/PJ, Comercial, Reforma, Projeto Legal, Completo+RT) com IA. Cliente assina
          digitalmente no portal. Grátis pra começar.
        </p>
        <Link href="/signup" className={`${buttonVariants({ size: "lg" })} mt-4`}>
          Criar conta grátis →
        </Link>
      </div>
    </div>
  );
}
