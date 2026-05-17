import Link from "next/link";
import { Separator } from "@/components/ui/separator";

type Props = { orgName: string };

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", sprint: null },
  { href: "/projetos", label: "Projetos", sprint: 2 },
  { href: "/clientes", label: "Clientes", sprint: 2 },
  { href: "/configuracoes", label: "Configurações", sprint: 1 },
  { href: "/billing", label: "Billing", sprint: 7 },
] as const;

export function Sidebar({ orgName }: Props) {
  return (
    <aside className="hidden w-60 shrink-0 border-r border-zinc-200 bg-white md:flex md:flex-col dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex h-14 items-center border-b border-zinc-200 px-4 dark:border-zinc-800">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          Memorial<span className="text-zinc-500">.ai</span>
        </Link>
      </div>
      <div className="px-3 py-3">
        <p className="truncate px-2 text-xs tracking-wider text-zinc-500 uppercase">{orgName}</p>
      </div>
      <Separator />
      <nav className="flex-1 px-2 py-3">
        <ul className="space-y-1">
          {NAV_ITEMS.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className="block rounded-md px-3 py-2 text-sm text-zinc-700 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <div className="border-t border-zinc-200 p-3 text-xs text-zinc-500 dark:border-zinc-800">
        Sprint 1 — Fundação
      </div>
    </aside>
  );
}
