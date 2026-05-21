import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getCubFaixa, type CubPadrao } from "@/lib/budget/cub";
import { Building2, Info } from "lucide-react";

type Props = {
  uf: string;
  padrao: CubPadrao | null;
  areaM2: number | null;
};

function brl(v: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(v);
}

const PADRAO_LABEL: Record<CubPadrao, string> = {
  popular: "popular",
  medio: "médio",
  alto: "alto",
  luxo: "luxo",
};

export async function CubPreviewCard({ uf, padrao, areaM2 }: Props) {
  if (!padrao || !areaM2 || areaM2 <= 0) {
    return (
      <Card className="border-zinc-200 bg-gradient-to-br from-blue-50/30 to-white dark:border-zinc-800 dark:from-blue-950/10 dark:to-zinc-900">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Building2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            CUB de referência
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-zinc-600 dark:text-zinc-400">
          <p>
            <Info className="-mt-0.5 mr-1 inline-block h-3.5 w-3.5" />
            Confirme a extração da planta com <strong>padrão construtivo</strong> e{" "}
            <strong>área total</strong> pra ver a faixa CUB esperada do estado pra esta obra.
          </p>
        </CardContent>
      </Card>
    );
  }

  const faixa = await getCubFaixa(uf, padrao);
  const totalMin = faixa.faixa_min * areaM2;
  const totalMax = faixa.faixa_max * areaM2;

  const mesLabel = new Date(faixa.mes_referencia).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });

  return (
    <Card className="border-zinc-200 bg-gradient-to-br from-blue-50/30 to-white shadow-sm dark:border-zinc-800 dark:from-blue-950/10 dark:to-zinc-900">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Building2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            CUB de referência — <span className="text-blue-700 dark:text-blue-400">{faixa.uf}</span>
          </CardTitle>
          <Badge
            className={
              faixa.origem === "db"
                ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300"
                : "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300"
            }
          >
            {faixa.origem === "db" ? `Dados ${faixa.fonte ?? "SINDUSCON"}` : "Estimativa (base SE)"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="grid gap-3 sm:grid-cols-3">
          <Stat
            label={`R$ / m² · padrão ${PADRAO_LABEL[padrao]}`}
            value={`${brl(faixa.faixa_min)} – ${brl(faixa.faixa_max)}`}
            tone="blue"
          />
          <Stat label="Área da obra" value={`${areaM2.toLocaleString("pt-BR")} m²`} tone="zinc" />
          <Stat
            label="Total esperado"
            value={`${brl(totalMin)} – ${brl(totalMax)}`}
            tone="emerald"
            accent
          />
        </div>

        <div className="rounded-md border border-blue-200/60 bg-white/60 p-3 text-xs text-zinc-700 dark:border-blue-900/40 dark:bg-zinc-950/40 dark:text-zinc-300">
          <p>
            <strong>Como interpretar:</strong> CUB é o custo unitário básico médio da construção
            civil por <em>m²</em>, divulgado mensalmente pelo SINDUSCON do seu estado. Se o seu
            orçamento ficar fora desta faixa, a IA vai alertar pra você revisar.
          </p>
          <p className="mt-1 text-[11px] text-zinc-500">
            Referência: {mesLabel} · padrão construtivo &ldquo;{PADRAO_LABEL[padrao]}&rdquo;
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function Stat({
  label,
  value,
  tone,
  accent,
}: {
  label: string;
  value: string;
  tone: "blue" | "emerald" | "zinc";
  accent?: boolean;
}) {
  const toneStyles: Record<typeof tone, { label: string; value: string }> = {
    blue: {
      label: "text-blue-700 dark:text-blue-400",
      value: "text-zinc-900 dark:text-zinc-100",
    },
    emerald: {
      label: "text-emerald-700 dark:text-emerald-400",
      value: "text-emerald-700 dark:text-emerald-300",
    },
    zinc: {
      label: "text-zinc-600 dark:text-zinc-400",
      value: "text-zinc-900 dark:text-zinc-100",
    },
  };
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
      <p className={`text-[10px] font-medium tracking-wider uppercase ${toneStyles[tone].label}`}>
        {label}
      </p>
      <p
        className={`mt-1 ${accent ? "text-base" : "text-sm"} font-semibold tabular-nums ${toneStyles[tone].value}`}
      >
        {value}
      </p>
    </div>
  );
}
