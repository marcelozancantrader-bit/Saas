"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";

export type TabKey = "visao" | "planta" | "validacao" | "briefing" | "art-rrt" | "escopo";

type TabItem = {
  key: TabKey;
  label: string;
  hint?: string;
  badge?: number | string;
};

type Props = {
  tabs: TabItem[];
  current: TabKey;
};

/**
 * Tabs com state em URL (?tab=visao). Server component faz o split do conteúdo
 * baseado no searchParam; este componente só renderiza a barra.
 */
export function ProjectTabs({ tabs, current }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function setTab(key: TabKey) {
    const params = new URLSearchParams(Array.from(searchParams.entries()));
    if (key === "visao") {
      params.delete("tab");
    } else {
      params.set("tab", key);
    }
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  return (
    <div className="overflow-x-auto">
      <div className="flex min-w-max items-center gap-1 border-b border-zinc-200 dark:border-zinc-800">
        {tabs.map((t) => {
          const active = current === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={[
                "relative px-4 py-3 text-base font-medium transition-colors",
                active
                  ? "text-zinc-900 dark:text-zinc-50"
                  : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100",
              ].join(" ")}
            >
              <span className="flex items-center gap-1.5">
                {t.label}
                {t.badge !== undefined && t.badge !== null && t.badge !== 0 ? (
                  <span
                    className={[
                      "inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-sm font-medium",
                      active
                        ? "bg-zinc-900 text-zinc-50 dark:bg-zinc-50 dark:text-zinc-900"
                        : "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
                    ].join(" ")}
                  >
                    {t.badge}
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
