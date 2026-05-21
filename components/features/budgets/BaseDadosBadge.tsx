import { Database, AlertTriangle } from "lucide-react";

const MES_LABEL = [
  "jan",
  "fev",
  "mar",
  "abr",
  "mai",
  "jun",
  "jul",
  "ago",
  "set",
  "out",
  "nov",
  "dez",
];

function formatMes(iso: string): string {
  const m = iso.match(/^(\d{4})-(\d{2})/);
  if (!m) return iso;
  return `${MES_LABEL[Number(m[2]) - 1] ?? "—"}/${m[1]}`;
}

function diasDesde(iso: string): number {
  return Math.floor((new Date().getTime() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24));
}

type Props = {
  sinapiMes: string | null;
  cubMes: string | null;
  uf: string;
};

/**
 * Badge que mostra a data dos dados base (SINAPI + CUB) usados pra calcular
 * o orçamento. Sinaliza com cor âmbar se >60 dias (dados podem estar
 * desatualizados).
 */
export function BaseDadosBadge({ sinapiMes, cubMes, uf }: Props) {
  const sinapiDias = sinapiMes ? diasDesde(sinapiMes) : null;
  const cubDias = cubMes ? diasDesde(cubMes) : null;
  const algumAntigo =
    (sinapiDias !== null && sinapiDias > 60) || (cubDias !== null && cubDias > 60);

  return (
    <div
      className={`inline-flex flex-wrap items-center gap-2 rounded-md border px-2.5 py-1.5 text-xs ${
        algumAntigo
          ? "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200"
          : "border-zinc-200 bg-zinc-50 text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
      }`}
    >
      {algumAntigo ? (
        <AlertTriangle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
      ) : (
        <Database className="h-3.5 w-3.5 text-zinc-400" />
      )}
      <span className="font-medium">Base de cálculo:</span>
      {sinapiMes ? (
        <span>
          SINAPI <strong className="font-semibold">{formatMes(sinapiMes)}</strong>
        </span>
      ) : (
        <span className="text-zinc-500">SINAPI sem dados</span>
      )}
      <span className="text-zinc-300 dark:text-zinc-700">·</span>
      {cubMes ? (
        <span>
          CUB-{uf} <strong className="font-semibold">{formatMes(cubMes)}</strong>
        </span>
      ) : (
        <span className="text-zinc-500">CUB-{uf} sem dados</span>
      )}
      {algumAntigo ? (
        <span className="ml-1 text-[10px] font-medium">
          ({Math.max(sinapiDias ?? 0, cubDias ?? 0)} dias atrás — pode estar desatualizado)
        </span>
      ) : null}
    </div>
  );
}
