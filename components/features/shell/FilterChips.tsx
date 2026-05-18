"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Badge } from "@/components/ui/badge";

export type FilterOption = {
  value: string;
  label: string;
};

type Props = {
  paramName: string;
  options: FilterOption[];
  allLabel?: string;
};

/**
 * Chips de filtro que escrevem em URL search params (server-side filter).
 * Sem valor selecionado = "Todos" (apaga o param).
 */
export function FilterChips({ paramName, options, allLabel = "Todos" }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const current = searchParams.get(paramName);

  function setValue(v: string | null) {
    const params = new URLSearchParams(Array.from(searchParams.entries()));
    if (v) params.set(paramName, v);
    else params.delete(paramName);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <button type="button" onClick={() => setValue(null)} className="cursor-pointer">
        <Badge variant={current ? "outline" : "default"}>{allLabel}</Badge>
      </button>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => setValue(o.value)}
          className="cursor-pointer"
        >
          <Badge variant={current === o.value ? "default" : "outline"}>{o.label}</Badge>
        </button>
      ))}
    </div>
  );
}
