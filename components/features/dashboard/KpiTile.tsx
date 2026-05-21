import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowRight } from "lucide-react";

export type KpiTileProps = {
  label: string;
  value: string;
  hint: string;
  icon: LucideIcon;
  /** Tom temático aplicado ao ícone, accent e gradiente sutil */
  tone: "blue" | "emerald" | "amber" | "violet" | "rose" | "zinc";
  href?: string;
  /** Delta opcional para indicar variação (positive | negative | neutral) */
  delta?: { label: string; direction: "up" | "down" | "neutral" };
};

const TONE_STYLES: Record<
  KpiTileProps["tone"],
  {
    border: string;
    iconBg: string;
    iconColor: string;
    accentBar: string;
    hoverBorder: string;
    valueColor: string;
  }
> = {
  blue: {
    border: "border-zinc-200 dark:border-zinc-800",
    iconBg: "bg-blue-50 dark:bg-blue-950/40",
    iconColor: "text-blue-600 dark:text-blue-400",
    accentBar: "bg-blue-500",
    hoverBorder: "hover:border-blue-300 dark:hover:border-blue-700",
    valueColor: "text-zinc-900 dark:text-zinc-50",
  },
  emerald: {
    border: "border-zinc-200 dark:border-zinc-800",
    iconBg: "bg-emerald-50 dark:bg-emerald-950/40",
    iconColor: "text-emerald-600 dark:text-emerald-400",
    accentBar: "bg-emerald-500",
    hoverBorder: "hover:border-emerald-300 dark:hover:border-emerald-700",
    valueColor: "text-zinc-900 dark:text-zinc-50",
  },
  amber: {
    border: "border-zinc-200 dark:border-zinc-800",
    iconBg: "bg-amber-50 dark:bg-amber-950/40",
    iconColor: "text-amber-600 dark:text-amber-400",
    accentBar: "bg-amber-500",
    hoverBorder: "hover:border-amber-300 dark:hover:border-amber-700",
    valueColor: "text-zinc-900 dark:text-zinc-50",
  },
  violet: {
    border: "border-zinc-200 dark:border-zinc-800",
    iconBg: "bg-violet-50 dark:bg-violet-950/40",
    iconColor: "text-violet-600 dark:text-violet-400",
    accentBar: "bg-violet-500",
    hoverBorder: "hover:border-violet-300 dark:hover:border-violet-700",
    valueColor: "text-zinc-900 dark:text-zinc-50",
  },
  rose: {
    border: "border-zinc-200 dark:border-zinc-800",
    iconBg: "bg-rose-50 dark:bg-rose-950/40",
    iconColor: "text-rose-600 dark:text-rose-400",
    accentBar: "bg-rose-500",
    hoverBorder: "hover:border-rose-300 dark:hover:border-rose-700",
    valueColor: "text-zinc-900 dark:text-zinc-50",
  },
  zinc: {
    border: "border-zinc-200 dark:border-zinc-800",
    iconBg: "bg-zinc-100 dark:bg-zinc-800",
    iconColor: "text-zinc-600 dark:text-zinc-400",
    accentBar: "bg-zinc-400",
    hoverBorder: "hover:border-zinc-300 dark:hover:border-zinc-700",
    valueColor: "text-zinc-900 dark:text-zinc-50",
  },
};

export function KpiTile({ label, value, hint, icon: Icon, tone, href, delta }: KpiTileProps) {
  const styles = TONE_STYLES[tone];

  const inner = (
    <div
      className={`group relative h-full overflow-hidden rounded-xl border bg-white p-4 shadow-sm transition-all dark:bg-zinc-900 ${styles.border} ${href ? `${styles.hoverBorder} hover:-translate-y-0.5 hover:shadow-md` : ""}`}
    >
      {/* Accent bar topo */}
      <span
        className={`absolute inset-x-0 top-0 h-0.5 ${styles.accentBar} opacity-60 group-hover:opacity-100`}
      />

      <div className="flex items-start justify-between gap-2">
        <span
          className={`inline-flex h-9 w-9 items-center justify-center rounded-lg ${styles.iconBg}`}
        >
          <Icon className={`h-4 w-4 ${styles.iconColor}`} />
        </span>
        {href ? (
          <ArrowRight className="h-4 w-4 text-zinc-400 transition-transform group-hover:translate-x-0.5" />
        ) : null}
      </div>

      <p className="mt-3 text-xs font-medium text-zinc-600 dark:text-zinc-400">{label}</p>
      <p className={`mt-1 text-3xl font-semibold tracking-tight tabular-nums ${styles.valueColor}`}>
        {value}
      </p>

      <div className="mt-2 flex items-center gap-2 text-[11px]">
        {delta && (
          <span
            className={`inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 font-medium ${
              delta.direction === "up"
                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                : delta.direction === "down"
                  ? "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300"
                  : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
            }`}
          >
            {delta.direction === "up" ? "↗" : delta.direction === "down" ? "↘" : "→"} {delta.label}
          </span>
        )}
        <span className="text-zinc-500">{hint}</span>
      </div>
    </div>
  );

  return href ? (
    <Link href={href} className="block">
      {inner}
    </Link>
  ) : (
    inner
  );
}
