"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/brand/Logo";
import {
  LayoutDashboard,
  Briefcase,
  Users,
  Settings,
  CreditCard,
  Sparkles,
  Plus,
  UserPlus,
} from "lucide-react";

export const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/projetos", label: "Projetos", icon: Briefcase },
  { href: "/clientes", label: "Clientes", icon: Users },
  { href: "/configuracoes", label: "Configurações", icon: Settings },
  { href: "/billing", label: "Plano & cobrança", icon: CreditCard },
] as const;

type Props = {
  orgName: string;
  /** Chamado quando um link é clicado (usado pelo drawer mobile pra fechar). */
  onNavigate?: () => void;
};

export function SidebarContent({ orgName, onNavigate }: Props) {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col">
      {/* Brand */}
      <div className="flex h-14 items-center gap-2 border-b border-zinc-200 px-4 dark:border-zinc-800">
        <Link
          href="/dashboard"
          onClick={onNavigate}
          className="inline-flex items-center gap-2"
          aria-label="Memorial.ai"
        >
          <Logo size={24} />
        </Link>
      </div>

      {/* Workspace card */}
      <div className="px-3 pt-3">
        <div className="rounded-lg border border-zinc-200 bg-gradient-to-br from-blue-50 to-white px-3 py-2.5 dark:border-zinc-800 dark:from-blue-950/30 dark:to-zinc-900">
          <p className="text-[10px] font-medium tracking-wider text-blue-700 uppercase dark:text-blue-400">
            Workspace
          </p>
          <p className="mt-0.5 truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            {orgName}
          </p>
        </div>
      </div>

      {/* Atalhos rápidos — ações mais frequentes */}
      <div className="space-y-1.5 px-3 pt-3">
        <Link
          href="/projetos/novo"
          onClick={onNavigate}
          data-tour="novo-projeto"
          className="flex items-center justify-center gap-1.5 rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500"
        >
          <Plus className="h-4 w-4" />
          Novo projeto
        </Link>
        <Link
          href="/clientes/novo"
          onClick={onNavigate}
          className="flex items-center justify-center gap-1.5 rounded-md border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-700 transition-colors hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          <UserPlus className="h-3.5 w-3.5" />
          Novo cliente
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-3">
        <ul className="space-y-0.5">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={onNavigate}
                  data-tour={item.href === "/projetos" ? "projetos-link" : undefined}
                  className={`group relative flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-all ${
                    active
                      ? "bg-blue-50 font-medium text-blue-700 dark:bg-blue-950/40 dark:text-blue-300"
                      : "text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
                  }`}
                >
                  {active && (
                    <span className="absolute top-1 bottom-1 left-0 w-0.5 rounded-r bg-blue-600 dark:bg-blue-400" />
                  )}
                  <Icon
                    className={`h-4 w-4 ${
                      active ? "text-blue-600 dark:text-blue-400" : "text-zinc-500"
                    }`}
                  />
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer hint */}
      <div className="border-t border-zinc-200 px-3 py-3 dark:border-zinc-800">
        <div className="flex items-center gap-2 rounded-md bg-zinc-50 px-2.5 py-2 text-[11px] text-zinc-600 dark:bg-zinc-800/60 dark:text-zinc-400">
          <Sparkles className="h-3.5 w-3.5 shrink-0 text-blue-500 dark:text-blue-400" />
          <span>
            Pressione{" "}
            <kbd className="rounded border border-zinc-300 bg-white px-1 font-mono text-[10px] text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
              ⌘K
            </kbd>{" "}
            pra ir rápido
          </span>
        </div>
      </div>
    </div>
  );
}
