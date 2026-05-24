"use client";

import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { BudgetItem } from "@/app/(app)/projetos/[id]/orcamento/[budgetId]/page";
import { formatBRL } from "@/lib/utils/money";

type ABCRow = {
  index: number;
  rank: number;
  shortLabel: string;
  fullLabel: string;
  total: number;
  pct: number;
  cumPct: number;
  classe: "A" | "B" | "C";
};

const COLORS: Record<ABCRow["classe"], string> = {
  A: "#dc2626", // red — top 20% que somam ~80%
  B: "#f59e0b", // amber
  C: "#10b981", // emerald
};

function classify(cumPct: number): ABCRow["classe"] {
  if (cumPct <= 80) return "A";
  if (cumPct <= 95) return "B";
  return "C";
}

export function CurvaABC({ items }: { items: BudgetItem[] }) {
  const rows = useMemo<ABCRow[]>(() => {
    const sorted = [...items].sort((a, b) => Number(b.total) - Number(a.total));
    const total = sorted.reduce((acc, i) => acc + Number(i.total), 0);
    if (total === 0) return [];
    let cum = 0;
    return sorted.map((item, idx) => {
      const t = Number(item.total);
      const pct = (t / total) * 100;
      cum += pct;
      return {
        index: idx,
        rank: idx + 1,
        shortLabel: `${idx + 1}`,
        fullLabel: item.descricao,
        total: t,
        pct,
        cumPct: cum,
        classe: classify(cum),
      };
    });
  }, [items]);

  if (rows.length === 0) {
    return <p className="text-sm text-zinc-500">Sem dados para gerar a curva.</p>;
  }

  const top10 = rows.slice(0, 10);

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
      {/* Gráfico — coluna larga, espalha em telas grandes */}
      <div className="h-56 w-full lg:h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={top10} margin={{ top: 8, right: 8, left: 0, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
            <XAxis dataKey="shortLabel" fontSize={10} />
            <YAxis fontSize={10} tickFormatter={(v) => `${v.toFixed(0)}%`} />
            <Tooltip
              formatter={(_value, _name, props) => [
                `${(props.payload as ABCRow).pct.toFixed(1)}% (${formatBRL((props.payload as ABCRow).total)})`,
                "Participação",
              ]}
              labelFormatter={(label, payload) =>
                payload?.[0]?.payload ? (payload[0].payload as ABCRow).fullLabel : `Item ${label}`
              }
              contentStyle={{ fontSize: 12 }}
            />
            <Bar dataKey="pct">
              {top10.map((r) => (
                <Cell key={r.index} fill={COLORS[r.classe]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Top 5 + legenda — coluna estreita à direita em desktop */}
      <div className="space-y-2 text-xs">
        <p className="font-medium text-zinc-700 dark:text-zinc-300">Top 5 itens</p>
        <ol className="space-y-0.5">
          {rows.slice(0, 5).map((r) => (
            <li key={r.index} className="flex items-center justify-between gap-2">
              <span className="flex min-w-0 items-center gap-1.5">
                <span
                  className="inline-block h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: COLORS[r.classe] }}
                />
                <span className="truncate text-zinc-700 dark:text-zinc-300">{r.fullLabel}</span>
              </span>
              <span className="shrink-0 text-zinc-500 tabular-nums">{r.pct.toFixed(1)}%</span>
            </li>
          ))}
        </ol>
        <div className="mt-2 flex flex-wrap gap-3 border-t border-zinc-200 pt-2 text-xs text-zinc-500 dark:border-zinc-800">
          <span className="inline-flex items-center gap-1">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ backgroundColor: COLORS.A }}
            />
            A: até 80%
          </span>
          <span className="inline-flex items-center gap-1">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ backgroundColor: COLORS.B }}
            />
            B: 80–95%
          </span>
          <span className="inline-flex items-center gap-1">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ backgroundColor: COLORS.C }}
            />
            C: 95–100%
          </span>
        </div>
      </div>
    </div>
  );
}
