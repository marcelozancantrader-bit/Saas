"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { Search, X } from "lucide-react";
import { PLAN_ORDER, PLANS } from "@/lib/plans/limits";

export function OrgListFilters() {
  const router = useRouter();
  const sp = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [q, setQ] = useState(sp.get("q") ?? "");

  function updateParam(key: string, value: string | null) {
    const params = new URLSearchParams(sp.toString());
    if (value === null || value === "" || value === "all") {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    params.delete("page"); // reset paginação
    startTransition(() => {
      router.replace(`/admin/organizations?${params.toString()}`);
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/30 p-3">
      <form
        className="relative min-w-[240px] flex-1"
        onSubmit={(e) => {
          e.preventDefault();
          updateParam("q", q);
        }}
      >
        <Search className="pointer-events-none absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-zinc-500" />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por nome ou CNPJ…"
          className="w-full rounded-md border border-zinc-800 bg-zinc-950 py-1.5 pr-8 pl-8 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-amber-500 focus:outline-none"
        />
        {q && (
          <button
            type="button"
            onClick={() => {
              setQ("");
              updateParam("q", null);
            }}
            className="absolute top-1/2 right-2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </form>

      <select
        defaultValue={sp.get("plano") ?? "all"}
        onChange={(e) => updateParam("plano", e.target.value)}
        className="rounded-md border border-zinc-800 bg-zinc-950 px-2 py-1.5 text-sm text-zinc-100 focus:border-amber-500 focus:outline-none"
      >
        <option value="all">Todos os planos</option>
        {PLAN_ORDER.map((p) => (
          <option key={p} value={p}>
            {PLANS[p].label}
          </option>
        ))}
      </select>

      <label className="flex items-center gap-1.5 text-xs text-zinc-400">
        <input
          type="checkbox"
          defaultChecked={sp.get("onlyPaid") === "1"}
          onChange={(e) => updateParam("onlyPaid", e.target.checked ? "1" : null)}
          className="rounded border-zinc-700 bg-zinc-950"
        />
        Só pagas
      </label>

      <label className="flex items-center gap-1.5 text-xs text-zinc-400">
        <input
          type="checkbox"
          defaultChecked={sp.get("onlySuspended") === "1"}
          onChange={(e) => updateParam("onlySuspended", e.target.checked ? "1" : null)}
          className="rounded border-zinc-700 bg-zinc-950"
        />
        Só suspensas
      </label>

      {pending && <span className="text-xs text-zinc-500">Atualizando…</span>}
    </div>
  );
}
