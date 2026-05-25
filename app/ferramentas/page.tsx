import Link from "next/link";
import { Calculator, FileSpreadsheet, Home } from "lucide-react";

export const revalidate = 86400;

export const metadata = {
  title: "Ferramentas grátis para arquitetos e engenheiros — Memorial.ai",
  description:
    "3 calculadoras gratuitas: orçamento SINAPI estimativo por área, honorário arquitetônico CAU e valor CUB regional atualizado por UF. Sem cadastro.",
};

const FERRAMENTAS = [
  {
    href: "/ferramentas/orcamento-sinapi-gratis",
    icon: FileSpreadsheet,
    titulo: "Orçamento SINAPI estimativo",
    descricao:
      "Informe UF, área construída e padrão. Calculadora retorna estimativa baseada em SINAPI atualizada (referencial — não substitui orçamento completo).",
  },
  {
    href: "/ferramentas/honorario-cau",
    icon: Calculator,
    titulo: "Honorário arquitetônico CAU",
    descricao:
      "Calcula faixa de honorário sugerida com base na tabela CAU/BR (% sobre o custo da obra). Útil pra precificar proposta inicial.",
  },
  {
    href: "/ferramentas/cub-regional",
    icon: Home,
    titulo: "Valor CUB por UF",
    descricao:
      "Mostra o CUB médio (R$/m²) por estado e padrão construtivo na data base mais recente. Fonte: SINDUSCON regionais.",
  },
];

export default function FerramentasIndexPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:py-16">
      <div className="text-center">
        <p className="text-xs tracking-wider text-blue-700 uppercase dark:text-blue-400">
          Ferramentas grátis · Sem cadastro
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
          Calculadoras pra arquitetos e engenheiros
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-base text-zinc-600 dark:text-zinc-400">
          3 calculadoras públicas, baseadas em fontes oficiais (SINAPI, CAU/BR, SINDUSCON). Use
          livremente. Pra orçamento completo com 30+ itens, geração de memorial, contrato e portal
          do cliente,{" "}
          <Link href="/signup" className="font-medium text-blue-600 hover:underline">
            crie conta grátis no Memorial.ai
          </Link>
          .
        </p>
      </div>

      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {FERRAMENTAS.map((f) => {
          const Icon = f.icon;
          return (
            <Link
              key={f.href}
              href={f.href}
              className="group flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-blue-700"
            >
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
                <Icon className="h-5 w-5" />
              </span>
              <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                {f.titulo}
              </h2>
              <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                {f.descricao}
              </p>
              <p className="text-xs font-medium text-blue-600 group-hover:underline dark:text-blue-400">
                Abrir calculadora →
              </p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
