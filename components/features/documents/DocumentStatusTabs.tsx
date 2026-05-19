"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";

type DocStatus = "rascunho" | "aguardando_aprovacao" | "aprovado" | "recusado" | "arquivado";

type Counts = {
  all: number;
  rascunho: number;
  aguardando_aprovacao: number;
  aprovado: number;
  recusado: number;
  arquivado: number;
};

type Props = {
  counts: Counts;
  current: DocStatus | null;
};

const TABS: Array<{ key: DocStatus | null; label: string; countKey: keyof Counts }> = [
  { key: null, label: "Todos", countKey: "all" },
  { key: "rascunho", label: "Rascunhos", countKey: "rascunho" },
  { key: "aguardando_aprovacao", label: "Aguardando", countKey: "aguardando_aprovacao" },
  { key: "aprovado", label: "Aprovados", countKey: "aprovado" },
  { key: "recusado", label: "Recusados", countKey: "recusado" },
  { key: "arquivado", label: "Arquivados", countKey: "arquivado" },
];

export function DocumentStatusTabs({ counts, current }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function setStatus(s: DocStatus | null) {
    const params = new URLSearchParams(Array.from(searchParams.entries()));
    if (s) params.set("status", s);
    else params.delete("status");
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  return (
    <div className="overflow-x-auto">
      <div className="flex min-w-max items-center gap-1 border-b border-zinc-200 dark:border-zinc-800">
        {TABS.map((t) => {
          const active = current === t.key;
          const count = counts[t.countKey];
          return (
            <button
              key={t.key ?? "all"}
              type="button"
              onClick={() => setStatus(t.key)}
              className={[
                "relative px-4 py-3 text-base font-medium transition-colors",
                active
                  ? "text-zinc-900 dark:text-zinc-50"
                  : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100",
              ].join(" ")}
            >
              <span className="flex items-center gap-1.5">
                {t.label}
                {count > 0 ? (
                  <span
                    className={[
                      "inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-sm font-medium",
                      active
                        ? "bg-zinc-900 text-zinc-50 dark:bg-zinc-50 dark:text-zinc-900"
                        : "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
                    ].join(" ")}
                  >
                    {count}
                  </span>
                ) : null}
              </span>
              {active ? (
                <span className="absolute right-0 bottom-0 left-0 h-0.5 bg-zinc-900 dark:bg-zinc-50" />
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
