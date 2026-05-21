"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Building2,
  Users,
  CreditCard,
  TrendingUp,
  ScrollText,
  Flag,
  Megaphone,
  Activity,
  ShieldCheck,
  Database,
  Ruler,
} from "lucide-react";

type NavItem = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  exact?: boolean;
};

const NAV_ITEMS: NavItem[] = [
  { href: "/admin", label: "Visão geral", icon: LayoutDashboard, exact: true },
  { href: "/admin/organizations", label: "Organizações", icon: Building2 },
  { href: "/admin/users", label: "Usuários", icon: Users },
  { href: "/admin/subscriptions", label: "Assinaturas", icon: CreditCard },
  { href: "/admin/revenue", label: "Receita", icon: TrendingUp },
  { href: "/admin/sinapi", label: "SINAPI", icon: Database },
  { href: "/admin/cub", label: "CUB estadual", icon: Ruler },
  { href: "/admin/audit", label: "Auditoria", icon: ScrollText },
  { href: "/admin/feature-flags", label: "Feature flags", icon: Flag },
  { href: "/admin/announcements", label: "Anúncios", icon: Megaphone },
  { href: "/admin/health", label: "Health", icon: Activity },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-60 shrink-0 border-r border-zinc-800 bg-zinc-950 text-zinc-100 md:flex md:flex-col">
      <div className="flex h-14 items-center gap-2 border-b border-zinc-800 px-4">
        <ShieldCheck className="h-5 w-5 text-amber-400" />
        <div className="flex flex-col leading-tight">
          <span className="text-sm font-semibold">Memorial.ai</span>
          <span className="text-[10px] tracking-wider text-amber-400 uppercase">Painel Admin</span>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-3">
        <ul className="space-y-0.5">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = item.exact
              ? pathname === item.href
              : pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition ${
                    active
                      ? "bg-zinc-800 text-white"
                      : "text-zinc-400 hover:bg-zinc-900 hover:text-white"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t border-zinc-800 p-3">
        <Link
          href="/dashboard"
          className="flex items-center justify-center gap-2 rounded-md border border-zinc-800 px-3 py-2 text-xs text-zinc-400 hover:bg-zinc-900 hover:text-white"
        >
          ← Voltar ao app
        </Link>
      </div>
    </aside>
  );
}
