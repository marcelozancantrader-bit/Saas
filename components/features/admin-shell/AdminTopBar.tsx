"use client";

import { useState, useEffect, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LogOut, AlertTriangle, Search, Building2, User } from "lucide-react";
import { logoutAction } from "@/server/actions/auth/logout.action";

type Props = {
  userEmail: string;
};

type Hit = {
  type: "org" | "user";
  id: string;
  label: string;
  sub: string | null;
  href: string;
};

export function AdminTopBar({ userEmail }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [lastSearchedQuery, setLastSearchedQuery] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Fetch debounced. setLastSearchedQuery serve pra saber se hits cobrem o q atual.
  useEffect(() => {
    if (q.trim().length < 2) {
      return;
    }
    const ctrl = new AbortController();
    const id = setTimeout(async () => {
      try {
        const res = await fetch(`/api/admin/search?q=${encodeURIComponent(q)}`, {
          signal: ctrl.signal,
        });
        const json = await res.json();
        setHits(json.hits ?? []);
        setLastSearchedQuery(q);
      } catch {
        /* aborted */
      }
    }, 250);
    return () => {
      clearTimeout(id);
      ctrl.abort();
    };
  }, [q]);

  const searching = q.trim().length >= 2 && lastSearchedQuery !== q;
  const visibleHits = q.trim().length < 2 ? [] : hits;

  // Click outside
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  function navigate(href: string) {
    setOpen(false);
    setQ("");
    router.push(href);
  }

  return (
    <header className="flex h-14 items-center justify-between gap-3 border-b border-zinc-800 bg-zinc-950 px-4 text-zinc-100 md:px-6">
      <div className="hidden items-center gap-2 text-xs md:flex">
        <AlertTriangle className="h-4 w-4 text-amber-400" />
        <span className="text-amber-400">Modo administrativo — ações afetam toda a plataforma</span>
      </div>

      <div ref={containerRef} className="relative max-w-sm flex-1 md:max-w-md md:flex-none">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" />
        <input
          type="search"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="Buscar org ou usuário…"
          className="w-full rounded-md border border-zinc-800 bg-zinc-900 py-1.5 pr-3 pl-8 text-xs text-zinc-100 placeholder:text-zinc-600 focus:border-amber-500 focus:outline-none"
        />
        {open && q.trim().length >= 2 && (
          <div className="absolute top-full right-0 left-0 z-50 mt-1 max-h-80 overflow-y-auto rounded-md border border-zinc-800 bg-zinc-900 shadow-xl">
            {searching && <p className="px-3 py-2 text-xs text-zinc-500">Buscando…</p>}
            {!searching && visibleHits.length === 0 && (
              <p className="px-3 py-2 text-xs text-zinc-500">Nenhum resultado.</p>
            )}
            {visibleHits.map((h) => {
              const Icon = h.type === "org" ? Building2 : User;
              return (
                <button
                  key={`${h.type}-${h.id}`}
                  type="button"
                  onClick={() => navigate(h.href)}
                  className="flex w-full items-start gap-2 px-3 py-2 text-left text-xs hover:bg-zinc-800"
                >
                  <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-400" />
                  <div className="flex-1">
                    <p className="text-zinc-200">{h.label}</p>
                    {h.sub && <p className="text-[10px] text-zinc-500">{h.sub}</p>}
                  </div>
                  <span className="text-[10px] text-zinc-600 uppercase">{h.type}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        <span className="hidden text-xs text-zinc-400 md:inline">{userEmail}</span>
        <button
          type="button"
          disabled={pending}
          onClick={() => startTransition(() => logoutAction())}
          className="flex items-center gap-1.5 rounded-md border border-zinc-800 px-2.5 py-1.5 text-xs text-zinc-400 hover:bg-zinc-900 hover:text-white disabled:opacity-50"
        >
          <LogOut className="h-3.5 w-3.5" />
          Sair
        </button>
      </div>
    </header>
  );
}
