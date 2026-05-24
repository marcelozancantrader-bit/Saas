"use client";

import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Calculator } from "lucide-react";

// CUB médio simplificado (R$/m²) por padrão — média nacional aproximada.
// Pra cálculo público sem fetch DB; a /ferramentas/cub-regional tem os valores
// reais por UF e mês.
const CUB_BASE: Record<Padrao, { min: number; max: number; medio: number }> = {
  popular: { min: 1900, max: 2400, medio: 2150 },
  medio: { min: 2400, max: 3000, medio: 2700 },
  alto: { min: 3000, max: 4200, medio: 3600 },
  luxo: { min: 4200, max: 6500, medio: 5350 },
};

type Padrao = "popular" | "medio" | "alto" | "luxo";
type Escopo = "legal" | "completo" | "completo_rt";

const PADRAO_LABEL: Record<Padrao, string> = {
  popular: "Popular",
  medio: "Médio",
  alto: "Alto",
  luxo: "Luxo",
};

const ESCOPO_INFO: Record<Escopo, { label: string; pctMin: number; pctMax: number; hint: string }> =
  {
    legal: {
      label: "Apenas Projeto Legal (aprovação na prefeitura)",
      pctMin: 5,
      pctMax: 8,
      hint: "Escopo: plantas, cortes, fachadas, locação, memorial simplificado + protocolo. Sem executivo.",
    },
    completo: {
      label: "Projeto Completo (legal + executivo)",
      pctMin: 8,
      pctMax: 12,
      hint: "Inclui detalhamento executivo, especificações técnicas, planilha orçamentária. Sem acompanhamento de obra.",
    },
    completo_rt: {
      label: "Projeto Completo + Acompanhamento RT da obra",
      pctMin: 10,
      pctMax: 15,
      hint: "Tudo do completo + 2 visitas/mês durante obra com relatório fotográfico (RDO).",
    },
  };

function brl(v: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(v);
}

export function HonorarioCauCalculator() {
  const [area, setArea] = useState("150");
  const [padrao, setPadrao] = useState<Padrao>("medio");
  const [escopo, setEscopo] = useState<Escopo>("completo");

  const result = useMemo(() => {
    const a = Number(area);
    if (!Number.isFinite(a) || a <= 0) return null;
    const cub = CUB_BASE[padrao];
    const custoMin = a * cub.min;
    const custoMax = a * cub.max;
    const custoMedio = a * cub.medio;
    const e = ESCOPO_INFO[escopo];
    const honorarioMin = custoMin * (e.pctMin / 100);
    const honorarioMax = custoMax * (e.pctMax / 100);
    const honorarioMedio = custoMedio * ((e.pctMin + e.pctMax) / 2 / 100);
    return { custoMin, custoMax, custoMedio, honorarioMin, honorarioMax, honorarioMedio };
  }, [area, padrao, escopo]);

  return (
    <Card>
      <CardContent className="space-y-5 p-5">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="area">Área da obra (m²) *</Label>
            <Input
              id="area"
              type="number"
              min="1"
              step="1"
              value={area}
              onChange={(e) => setArea(e.target.value)}
              placeholder="150"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="padrao">Padrão construtivo *</Label>
            <Select value={padrao} onValueChange={(v) => v && setPadrao(v as Padrao)}>
              <SelectTrigger id="padrao">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(PADRAO_LABEL) as Padrao[]).map((p) => (
                  <SelectItem key={p} value={p}>
                    {PADRAO_LABEL[p]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="escopo">Escopo do contrato *</Label>
            <Select value={escopo} onValueChange={(v) => v && setEscopo(v as Escopo)}>
              <SelectTrigger id="escopo">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(ESCOPO_INFO) as Escopo[]).map((e) => (
                  <SelectItem key={e} value={e}>
                    {ESCOPO_INFO[e].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <p className="text-xs text-zinc-500">{ESCOPO_INFO[escopo].hint}</p>

        {result ? (
          <div className="space-y-3 rounded-lg border border-blue-200 bg-blue-50/40 p-4 dark:border-blue-900/40 dark:bg-blue-950/20">
            <div className="flex items-center gap-2 text-sm font-semibold text-blue-900 dark:text-blue-100">
              <Calculator className="h-4 w-4" />
              Resultado
            </div>

            <div className="grid gap-2 text-sm sm:grid-cols-2">
              <div>
                <p className="text-xs tracking-wide text-zinc-500 uppercase">
                  Custo de obra estimado
                </p>
                <p className="mt-0.5 font-mono text-base font-semibold">
                  {brl(result.custoMin)} – {brl(result.custoMax)}
                </p>
                <p className="text-[11px] text-zinc-500">média {brl(result.custoMedio)}</p>
              </div>
              <div>
                <p className="text-xs tracking-wide text-blue-700 uppercase dark:text-blue-300">
                  Honorário sugerido ({ESCOPO_INFO[escopo].pctMin}–{ESCOPO_INFO[escopo].pctMax}%)
                </p>
                <p className="mt-0.5 font-mono text-lg font-bold text-blue-900 dark:text-blue-100">
                  {brl(result.honorarioMin)} – {brl(result.honorarioMax)}
                </p>
                <p className="text-[11px] text-zinc-500">
                  ponto médio {brl(result.honorarioMedio)}
                </p>
              </div>
            </div>

            <p className="border-t border-blue-200 pt-2 text-[11px] text-zinc-600 italic dark:border-blue-900/40 dark:text-zinc-400">
              Cálculo referencial baseado na tabela CAU/BR e CUB médio nacional. Ajuste no contrato
              real conforme complexidade, prazo, deslocamento e revisões inclusas.
            </p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
