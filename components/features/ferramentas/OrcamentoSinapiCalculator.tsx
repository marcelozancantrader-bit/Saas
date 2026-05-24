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
import { FileSpreadsheet } from "lucide-react";

type Padrao = "popular" | "medio" | "alto" | "luxo";

// CUB médio simplificado por padrão — média nacional. Pra valores reais por
// UF/mês, a /ferramentas/cub-regional puxa do banco.
const CUB_NACIONAL: Record<Padrao, { min: number; max: number; medio: number }> = {
  popular: { min: 1900, max: 2400, medio: 2150 },
  medio: { min: 2400, max: 3000, medio: 2700 },
  alto: { min: 3000, max: 4200, medio: 3600 },
  luxo: { min: 4200, max: 6500, medio: 5350 },
};

// Fator regional aproximado (mesma lógica usada no Memorial.ai)
const FATOR_REGIONAL: Record<string, number> = {
  // Sudeste + Sul = 1.0 (base)
  SP: 1.0,
  RJ: 1.0,
  MG: 1.0,
  ES: 1.0,
  PR: 1.0,
  SC: 1.0,
  RS: 1.0,
  // Centro-Oeste = 0.95
  DF: 0.95,
  GO: 0.95,
  MT: 0.95,
  MS: 0.95,
  // Nordeste = 0.85
  BA: 0.85,
  PE: 0.85,
  CE: 0.85,
  MA: 0.85,
  RN: 0.85,
  PB: 0.85,
  AL: 0.85,
  SE: 0.85,
  PI: 0.85,
  // Norte = 0.80
  AM: 0.8,
  PA: 0.8,
  RR: 0.8,
  AP: 0.8,
  AC: 0.8,
  RO: 0.8,
  TO: 0.8,
};

const UFS = Object.keys(FATOR_REGIONAL).sort();

const PADRAO_LABEL: Record<Padrao, string> = {
  popular: "Popular (acabamento básico)",
  medio: "Médio (classe média típica)",
  alto: "Alto (acabamentos finos)",
  luxo: "Luxo (premium)",
};

function brl(v: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(v);
}

export function OrcamentoSinapiCalculator() {
  const [uf, setUf] = useState("SP");
  const [area, setArea] = useState("125");
  const [padrao, setPadrao] = useState<Padrao>("medio");
  const [bdi, setBdi] = useState("28");

  const result = useMemo(() => {
    const a = Number(area);
    const b = Number(bdi);
    if (!Number.isFinite(a) || a <= 0) return null;
    if (!Number.isFinite(b) || b < 0) return null;
    const cub = CUB_NACIONAL[padrao];
    const fator = FATOR_REGIONAL[uf] ?? 1.0;
    const cubMedioRegional = cub.medio * fator;
    const cubMinRegional = cub.min * fator;
    const cubMaxRegional = cub.max * fator;
    const brutoMin = a * cubMinRegional;
    const brutoMax = a * cubMaxRegional;
    const brutoMedio = a * cubMedioRegional;
    const bdiFactor = 1 + b / 100;
    return {
      cubMedio: cubMedioRegional,
      fator,
      brutoMin,
      brutoMax,
      brutoMedio,
      comBdiMin: brutoMin * bdiFactor,
      comBdiMax: brutoMax * bdiFactor,
      comBdiMedio: brutoMedio * bdiFactor,
      precoM2: cubMedioRegional * bdiFactor,
    };
  }, [uf, area, padrao, bdi]);

  return (
    <Card>
      <CardContent className="space-y-5 p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="uf">UF da obra *</Label>
            <Select value={uf} onValueChange={(v) => v && setUf(v)}>
              <SelectTrigger id="uf">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {UFS.map((u) => (
                  <SelectItem key={u} value={u}>
                    {u} (fator regional {FATOR_REGIONAL[u]?.toFixed(2)})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="area">Área construída (m²) *</Label>
            <Input
              id="area"
              type="number"
              min="1"
              step="1"
              value={area}
              onChange={(e) => setArea(e.target.value)}
              placeholder="125"
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
            <Label htmlFor="bdi">BDI (%) *</Label>
            <Input
              id="bdi"
              type="number"
              min="0"
              max="100"
              step="0.5"
              value={bdi}
              onChange={(e) => setBdi(e.target.value)}
              placeholder="28"
            />
            <p className="text-[11px] text-zinc-500">
              Típico: 25–32%. Cobre BDI próprio + impostos + lucro.
            </p>
          </div>
        </div>

        {result ? (
          <div className="space-y-3 rounded-lg border border-blue-200 bg-blue-50/40 p-4 dark:border-blue-900/40 dark:bg-blue-950/20">
            <div className="flex items-center gap-2 text-sm font-semibold text-blue-900 dark:text-blue-100">
              <FileSpreadsheet className="h-4 w-4" />
              Estimativa SINAPI · {uf} · {area} m² · {PADRAO_LABEL[padrao].split(" ")[0]}
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <Stat label="R$/m² c/ BDI" value={brl(result.precoM2)} hint="ponto médio regional" />
              <Stat
                label="Custo bruto (sem BDI)"
                value={`${brl(result.brutoMin)} – ${brl(result.brutoMax)}`}
                hint={`média ${brl(result.brutoMedio)}`}
              />
              <Stat
                label="Total c/ BDI"
                value={`${brl(result.comBdiMin)} – ${brl(result.comBdiMax)}`}
                hint={`média ${brl(result.comBdiMedio)}`}
                highlight
              />
            </div>

            <p className="border-t border-blue-200 pt-2 text-[11px] text-zinc-600 italic dark:border-blue-900/40 dark:text-zinc-400">
              Cálculo: área × CUB regional × ({uf} fator {result.fator.toFixed(2)}) × (1 + BDI).
              Faixa min–max reflete variação intrínseca do CUB por subpadrão. Cada SINDUSCON publica
              seu CUB mensalmente — pra valor exato consulte CUB Regional.
            </p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function Stat({
  label,
  value,
  hint,
  highlight,
}: {
  label: string;
  value: string;
  hint?: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={
        highlight
          ? "rounded-md bg-blue-100 p-3 dark:bg-blue-900/40"
          : "rounded-md bg-white p-3 dark:bg-zinc-900"
      }
    >
      <p className="text-xs tracking-wide text-zinc-500 uppercase">{label}</p>
      <p
        className={
          highlight
            ? "mt-1 font-mono text-base font-bold text-blue-900 dark:text-blue-100"
            : "mt-1 font-mono text-sm font-semibold"
        }
      >
        {value}
      </p>
      {hint ? <p className="mt-0.5 text-[11px] text-zinc-500">{hint}</p> : null}
    </div>
  );
}
