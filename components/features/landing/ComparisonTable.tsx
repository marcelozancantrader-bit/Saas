import { X, Check } from "lucide-react";

const ROWS = [
  {
    capability: "Memorial descritivo de 130m²",
    manual: "6-8 horas digitando do zero, copiando do projeto anterior",
    memorial: "15 minutos: IA gera, você revisa",
  },
  {
    capability: "Orçamento SINAPI completo",
    manual: "1 semana de planilha + cálculo manual de BDI + curva ABC",
    memorial: "1 minuto: 30+ itens já com preço do mês e BDI configurado",
  },
  {
    capability: "Memoriais técnicos (elétrico, hidráulico, estrutural)",
    manual: "4-6 horas POR disciplina, reinterpretando cada planta",
    memorial: "20 minutos por disciplina, IA específica pra cada uma",
  },
  {
    capability: "Aprovação do cliente",
    manual: 'WhatsApp "aprovado" sem prova legal, virou pesadelo no aditivo',
    memorial: "Portal único com IP, timestamp, hash e assinatura digital (MP 2.200-2)",
  },
  {
    capability: "ART/RRT preenchida",
    manual: "1-2 horas copiando manual do cadastro do cliente",
    memorial: "5 minutos: dados do CAU/CREA + cliente + obra já populados",
  },
  {
    capability: "Risco de aditivo não cobrado",
    manual: '5-15% do contrato perdido no "de favor"',
    memorial: "Formalizado: cliente solicita → você precifica → assina aditivo",
  },
  {
    capability: "Diário de obra / prova de estado",
    manual: "Fotos soltas no celular, sem data confiável, perdidas no rolo",
    memorial: "Timeline cronológica no projeto + visível no portal do cliente num clique",
  },
  {
    capability: "Cotação com fornecedor",
    manual: "Re-digitar lista de materiais em Excel ou WhatsApp pra cada fornecedor",
    memorial: "PDF/XLSX agrupado por família com 1 clique pra mandar a 3 fornecedores",
  },
  {
    capability: "Notificar cliente que o doc está pronto",
    manual: "E-mail que o cliente não abre + cobrar resposta semana inteira",
    memorial: "WhatsApp template direto pro celular do cliente com link do portal",
  },
];

export function ComparisonTable() {
  return (
    <section className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
      <div className="text-center">
        <p className="text-sm tracking-wider text-blue-700 uppercase dark:text-blue-400">
          Antes vs. depois
        </p>
        <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
          O custo invisível do método manual
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-base text-zinc-600 dark:text-zinc-400">
          Comparação direta entre o fluxo tradicional (planilha + Word + WhatsApp) e o Memorial.ai.
        </p>
      </div>

      <div className="mt-10 overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800">
        <table className="w-full">
          <thead className="bg-zinc-50 dark:bg-zinc-900">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                Tarefa
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-zinc-500">
                <span className="inline-flex items-center gap-1.5">
                  <X className="h-3.5 w-3.5 text-rose-500" />
                  Planilha + Word manual
                </span>
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-blue-700 dark:text-blue-400">
                <span className="inline-flex items-center gap-1.5">
                  <Check className="h-3.5 w-3.5" />
                  Memorial.ai
                </span>
              </th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((row, i) => (
              <tr
                key={row.capability}
                className={
                  i % 2 === 0 ? "bg-white dark:bg-zinc-950" : "bg-zinc-50/60 dark:bg-zinc-900/30"
                }
              >
                <td className="border-t border-zinc-200 px-4 py-4 align-top text-sm font-medium text-zinc-900 dark:border-zinc-800 dark:text-zinc-100">
                  {row.capability}
                </td>
                <td className="line-through-decoration border-t border-zinc-200 px-4 py-4 align-top text-sm text-zinc-500 dark:border-zinc-800">
                  {row.manual}
                </td>
                <td className="border-t border-zinc-200 px-4 py-4 align-top text-sm text-zinc-800 dark:border-zinc-800 dark:text-zinc-200">
                  {row.memorial}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
