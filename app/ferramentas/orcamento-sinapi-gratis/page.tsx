import Link from "next/link";
import { OrcamentoSinapiCalculator } from "@/components/features/ferramentas/OrcamentoSinapiCalculator";
import { buttonVariants } from "@/components/ui/button";

export const revalidate = 86400;

export const metadata = {
  title: "Orçamento SINAPI estimativo grátis — Memorial.ai",
  description:
    "Calculadora pública de orçamento de obra baseada em SINAPI por UF e padrão construtivo. Estimativa rápida com BDI. Sem cadastro. Para orçamento detalhado item-a-item, use o Memorial.ai.",
};

export default function OrcamentoSinapiGratisPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <div>
        <Link href="/ferramentas" className="text-sm text-zinc-500 hover:underline">
          ← Todas as ferramentas
        </Link>
        <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
          Orçamento SINAPI estimativo grátis
        </h1>
        <p className="mt-3 text-base text-zinc-600 dark:text-zinc-400">
          Informe UF da obra, área construída e padrão. A calculadora retorna estimativa baseada no{" "}
          <strong>CUB regional</strong> (que reflete preços SINAPI agregados) + BDI configurável.{" "}
          <strong>É uma faixa referencial</strong>, não substitui o orçamento detalhado item-a-item.
        </p>
      </div>

      <div className="mt-8">
        <OrcamentoSinapiCalculator />
      </div>

      <div className="mt-8 rounded-lg border border-amber-200 bg-amber-50/60 p-4 text-sm dark:border-amber-900/40 dark:bg-amber-950/20">
        <p className="font-semibold text-amber-900 dark:text-amber-100">
          ⚠ Limites desta ferramenta
        </p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-zinc-700 dark:text-zinc-300">
          <li>
            Estima por <strong>m² médio CUB</strong>, não composição SINAPI item-a-item
          </li>
          <li>
            Não considera elementos especiais (piscina, churrasqueira, garagem subterrânea,
            elevador, fundação especial)
          </li>
          <li>BDI default 28% — ajuste conforme sua realidade tributária e empresarial</li>
          <li>
            Não exporta PDF nem salva o cálculo —{" "}
            <Link href="/signup" className="font-medium text-blue-600 hover:underline">
              crie conta grátis
            </Link>{" "}
            pra orçamento detalhado, exportação e portal do cliente
          </li>
        </ul>
      </div>

      <div className="mt-8 rounded-xl border border-blue-200 bg-gradient-to-br from-blue-50 to-white p-6 text-center dark:border-blue-900/50 dark:from-blue-950/30 dark:to-zinc-900">
        <h2 className="text-lg font-semibold">Quer orçamento SINAPI completo, item-a-item?</h2>
        <p className="mx-auto mt-2 max-w-xl text-sm text-zinc-600 dark:text-zinc-400">
          No Memorial.ai você sobe a planta PDF, a IA extrai ambientes e elementos, e o sistema gera
          30+ itens SINAPI com preço atualizado por UF (todas as 27), curva ABC, BDI e PDF pronto
          pra enviar. Em 1 minuto. Grátis até 2 projetos.
        </p>
        <Link href="/signup" className={`${buttonVariants({ size: "lg" })} mt-4`}>
          Criar conta grátis →
        </Link>
      </div>
    </div>
  );
}
