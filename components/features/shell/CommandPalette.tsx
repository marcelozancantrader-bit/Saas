"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  LayoutDashboard,
  Briefcase,
  Users,
  Settings,
  CreditCard,
  HelpCircle,
  Plus,
  ShieldCheck,
  LogOut,
  Sparkles,
  FileText,
  Building2,
} from "lucide-react";
import { logoutAction } from "@/server/actions/auth/logout.action";

type Action = {
  id: string;
  label: string;
  hint?: string;
  category: "Navegação" | "Criar" | "Admin" | "Sistema";
  icon: typeof Search;
  shortcut?: string;
  run: () => void | Promise<void>;
};

type Props = {
  isPlatformAdmin: boolean;
};

export function CommandPalette({ isPlatformAdmin }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
    setActiveIndex(0);
  }, []);

  const goto = useCallback(
    (href: string) => {
      router.push(href);
      close();
    },
    [router, close],
  );

  // Tecla global Cmd+K / Ctrl+K
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      } else if (e.key === "Escape" && open) {
        close();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  // Focus no input quando abre
  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open]);

  const actions: Action[] = useMemo(
    () => [
      // Navegação
      {
        id: "nav-dashboard",
        label: "Dashboard",
        category: "Navegação",
        icon: LayoutDashboard,
        run: () => goto("/dashboard"),
      },
      {
        id: "nav-projetos",
        label: "Projetos",
        hint: "Lista de projetos",
        category: "Navegação",
        icon: Briefcase,
        run: () => goto("/projetos"),
      },
      {
        id: "nav-clientes",
        label: "Clientes",
        hint: "Lista de clientes",
        category: "Navegação",
        icon: Users,
        run: () => goto("/clientes"),
      },
      {
        id: "nav-billing",
        label: "Plano e cobrança",
        category: "Navegação",
        icon: CreditCard,
        run: () => goto("/billing"),
      },
      {
        id: "nav-configuracoes",
        label: "Configurações",
        category: "Navegação",
        icon: Settings,
        run: () => goto("/configuracoes"),
      },
      // Criar
      {
        id: "create-projeto",
        label: "Criar projeto",
        hint: "Novo projeto a partir de cliente",
        category: "Criar",
        icon: Plus,
        run: () => goto("/projetos/novo"),
      },
      {
        id: "create-cliente",
        label: "Criar cliente",
        category: "Criar",
        icon: Plus,
        run: () => goto("/clientes/novo"),
      },
      // Admin (condicional)
      ...(isPlatformAdmin
        ? [
            {
              id: "admin-overview",
              label: "Painel Admin (Visão geral)",
              category: "Admin" as const,
              icon: ShieldCheck,
              run: () => goto("/admin"),
            },
            {
              id: "admin-orgs",
              label: "Admin: Organizações",
              category: "Admin" as const,
              icon: Building2,
              run: () => goto("/admin/organizations"),
            },
            {
              id: "admin-users",
              label: "Admin: Usuários",
              category: "Admin" as const,
              icon: Users,
              run: () => goto("/admin/users"),
            },
            {
              id: "admin-revenue",
              label: "Admin: Receita",
              category: "Admin" as const,
              icon: Sparkles,
              run: () => goto("/admin/revenue"),
            },
            {
              id: "admin-audit",
              label: "Admin: Auditoria",
              category: "Admin" as const,
              icon: FileText,
              run: () => goto("/admin/audit"),
            },
          ]
        : []),
      // Sistema
      {
        id: "sys-help",
        label: "Suporte",
        hint: "Abrir e-mail",
        category: "Sistema",
        icon: HelpCircle,
        run: () => {
          window.location.href = "mailto:suporte@memorial.ai";
          close();
        },
      },
      {
        id: "sys-logout",
        label: "Sair",
        category: "Sistema",
        icon: LogOut,
        run: async () => {
          await logoutAction();
        },
      },
    ],
    [goto, isPlatformAdmin, close],
  );

  const filtered = useMemo(() => {
    if (!query.trim()) return actions;
    const q = query.toLowerCase();
    return actions.filter(
      (a) => a.label.toLowerCase().includes(q) || a.hint?.toLowerCase().includes(q),
    );
  }, [actions, query]);

  // Agrupa por categoria mantendo ordem original
  const grouped = useMemo(() => {
    const map = new Map<string, Action[]>();
    for (const a of filtered) {
      if (!map.has(a.category)) map.set(a.category, []);
      map.get(a.category)!.push(a);
    }
    return Array.from(map.entries());
  }, [filtered]);

  // Navigation keys
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((i) => Math.min(filtered.length - 1, i + 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((i) => Math.max(0, i - 1));
      } else if (e.key === "Enter") {
        e.preventDefault();
        const idx = Math.min(activeIndex, Math.max(0, filtered.length - 1));
        const action = filtered[idx];
        if (action) void action.run();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, filtered, activeIndex]);

  // activeIndex deve ficar sempre dentro do range; calculamos derivado em vez de useEffect.
  const safeActiveIndex = Math.min(activeIndex, Math.max(0, filtered.length - 1));

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Paleta de comandos"
      className="fixed inset-0 z-[100] flex items-start justify-center bg-black/50 px-4 pt-[15vh] backdrop-blur-sm"
      onClick={close}
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-zinc-200 px-3 py-2.5 dark:border-zinc-800">
          <Search className="h-4 w-4 text-zinc-500" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar comando ou página…"
            className="flex-1 bg-transparent text-sm text-zinc-900 placeholder:text-zinc-500 focus:outline-none dark:text-zinc-100"
          />
          <kbd className="hidden rounded border border-zinc-300 bg-zinc-100 px-1.5 py-0.5 font-mono text-[10px] text-zinc-500 sm:inline dark:border-zinc-700 dark:bg-zinc-800">
            Esc
          </kbd>
        </div>

        <div className="max-h-[400px] overflow-y-auto py-1">
          {filtered.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-zinc-500">
              Nada encontrado pra &ldquo;{query}&rdquo;.
            </p>
          ) : (
            grouped.map(([category, items]) => (
              <div key={category}>
                <p className="px-3 pt-2 pb-1 text-[10px] font-semibold tracking-wider text-zinc-500 uppercase">
                  {category}
                </p>
                {items.map((a) => {
                  const idx = filtered.indexOf(a);
                  const isActive = idx === safeActiveIndex;
                  const Icon = a.icon;
                  return (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => void a.run()}
                      onMouseEnter={() => setActiveIndex(idx)}
                      className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition ${
                        isActive
                          ? "bg-blue-50 text-blue-900 dark:bg-blue-950/40 dark:text-blue-100"
                          : "text-zinc-700 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-800"
                      }`}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span className="flex-1">{a.label}</span>
                      {a.hint && <span className="text-xs text-zinc-500">{a.hint}</span>}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        <div className="flex items-center justify-between border-t border-zinc-200 bg-zinc-50 px-3 py-1.5 text-[10px] text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/60">
          <span>
            <kbd className="rounded bg-zinc-200 px-1 dark:bg-zinc-800">↑↓</kbd> navegar ·{" "}
            <kbd className="rounded bg-zinc-200 px-1 dark:bg-zinc-800">↵</kbd> selecionar
          </span>
          <span>
            <kbd className="rounded bg-zinc-200 px-1 dark:bg-zinc-800">⌘K</kbd> abrir
          </span>
        </div>
      </div>
    </div>
  );
}
