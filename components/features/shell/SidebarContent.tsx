import Link from "next/link";
import { Separator } from "@/components/ui/separator";

export const NAV_ITEMS = [
  { href: "/", label: "Dashboard" },
  { href: "/projetos", label: "Projetos" },
  { href: "/clientes", label: "Clientes" },
  { href: "/configuracoes", label: "Configurações" },
  { href: "/billing", label: "Billing" },
] as const;

type Props = {
  orgName: string;
  /** Chamado quando um link é clicado (usado pelo drawer mobile pra fechar). */
  onNavigate?: () => void;
};

export function SidebarContent({ orgName, onNavigate }: Props) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-14 items-center border-b border-zinc-200 px-4 dark:border-zinc-800">
        <Link href="/" onClick={onNavigate} className="text-lg font-semibold tracking-tight">
          Memorial<span className="text-primary">.ai</span>
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
                onClick={onNavigate}
                className="block rounded-md px-3 py-2 text-sm text-zinc-700 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
