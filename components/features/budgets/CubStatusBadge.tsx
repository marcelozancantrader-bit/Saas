import { checkOrcamentoVsCubEstadual, type CubPadrao } from "@/lib/budget/cub";
import { CheckCircle2, AlertTriangle, AlertOctagon } from "lucide-react";

type Props = {
  uf: string;
  padrao: CubPadrao | null;
  areaM2: number | null;
  totalBruto: number;
  mes?: Date;
};

function brl(v: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(v);
}

export async function CubStatusBadge({ uf, padrao, areaM2, totalBruto, mes }: Props) {
  if (!padrao || !areaM2 || areaM2 <= 0 || totalBruto <= 0) {
    return null;
  }

  const result = await checkOrcamentoVsCubEstadual({
    total: totalBruto,
    area: areaM2,
    padrao,
    uf,
    mes,
  });

  const config = {
    ok: {
      color:
        "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-100",
      icon: CheckCircle2,
      iconColor: "text-emerald-600 dark:text-emerald-400",
      title: "Orçamento dentro do CUB",
    },
    below: {
      color:
        "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100",
      icon: AlertTriangle,
      iconColor: "text-amber-600 dark:text-amber-400",
      title: "Orçamento abaixo do CUB",
    },
    above: {
      color:
        "border-rose-200 bg-rose-50 text-rose-900 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-100",
      icon: AlertOctagon,
      iconColor: "text-rose-600 dark:text-rose-400",
      title: "Orçamento acima do CUB",
    },
  };

  const cfg = config[result.status];
  const Icon = cfg.icon;

  return (
    <div className={`rounded-lg border p-4 ${cfg.color}`}>
      <div className="flex items-start gap-3">
        <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${cfg.iconColor}`} />
        <div className="flex-1">
          <p className="text-sm font-semibold">{cfg.title}</p>
          <p className="mt-1 text-xs leading-relaxed">{result.msg}</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-3">
            <Stat label="Seu R$/m²" value={brl(result.porM2)} />
            <Stat
              label={`Faixa ${result.faixa.uf} (${result.faixa.padrao})`}
              value={`${brl(result.faixa.faixa_min)} – ${brl(result.faixa.faixa_max)}`}
            />
            <Stat
              label="Diferença do meio"
              value={`${result.ratio >= 1 ? "+" : ""}${((result.ratio - 1) * 100).toFixed(0)}%`}
            />
          </div>
          {result.faixa.origem === "fallback" && (
            <p className="mt-2 text-[10px] italic opacity-75">
              ⚠ UF {uf.toUpperCase()} ainda não tem CUB cadastrado — usando faixa base SE/SP.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-current/10 bg-white/40 px-2 py-1.5 dark:bg-black/20">
      <p className="text-[10px] tracking-wide uppercase opacity-70">{label}</p>
      <p className="mt-0.5 text-xs font-semibold tabular-nums">{value}</p>
    </div>
  );
}
