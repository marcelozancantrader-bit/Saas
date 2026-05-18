"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DISCIPLINA_LABEL, type Disciplina } from "@/lib/ai/prompts/_shared-extraction-schema";
import {
  rulesGasMarket,
  rulesHvacMarket,
  totalMarketItems,
  type GasData,
  type HvacData,
} from "@/lib/budget/rules/disciplines.v1";
import { formatBRL } from "@/lib/utils/money";

type ExtracaoEntry = {
  data?: Record<string, unknown>;
  confirmed_by_user?: boolean;
};

type Props = {
  extracoes: Partial<Record<Disciplina, ExtracaoEntry>>;
};

/**
 * Card "Orçamento por disciplina" — mostra:
 *  - Status de cada disciplina (extraída ✓ / confirmada ✓ / incluída no orçamento SINAPI)
 *  - Para gás/HVAC (sem SINAPI direto): preços de mercado calculados, com disclaimer.
 */
export function BudgetDisciplinasCard({ extracoes }: Props) {
  const disciplinas: Disciplina[] = ["electrical", "hydraulic", "structural", "gas", "hvac"];

  const hasAny = disciplinas.some((d) => extracoes[d]);
  if (!hasAny) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Orçamento por disciplina</CardTitle>
        <p className="text-xs text-zinc-600 dark:text-zinc-400">
          Disciplinas complementares confirmadas são somadas automaticamente ao orçamento SINAPI.
          Gás e climatização não têm composições SINAPI diretas — usam preços de referência de
          mercado.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {disciplinas.map((d) => {
          const entry = extracoes[d];
          if (!entry) return null;
          const isMarket = d === "gas" || d === "hvac";
          let totalMarket: string | null = null;
          if (isMarket && entry.data && entry.confirmed_by_user) {
            const items =
              d === "gas"
                ? rulesGasMarket(entry.data as GasData)
                : rulesHvacMarket(entry.data as HvacData);
            totalMarket = formatBRL(totalMarketItems(items).toFixed(2));
          }

          return (
            <div
              key={d}
              className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3 dark:border-zinc-800"
            >
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-medium">{DISCIPLINA_LABEL[d]}</p>
                {entry.confirmed_by_user ? (
                  <Badge variant="default">Confirmado</Badge>
                ) : (
                  <Badge variant="outline">Aguardando revisão</Badge>
                )}
                {!isMarket && entry.confirmed_by_user ? (
                  <Badge variant="secondary">No orçamento SINAPI</Badge>
                ) : null}
                {isMarket ? <Badge variant="outline">Preço de mercado</Badge> : null}
              </div>
              {totalMarket ? <p className="text-sm font-medium">{totalMarket} ref.</p> : null}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
