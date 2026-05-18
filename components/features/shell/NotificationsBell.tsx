"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { BellIcon } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { markNotificationReadAction } from "@/server/actions/notifications/mark-read.action";
import type { NotificationRow } from "@/server/services/notifications-load";

type Props = { initial: NotificationRow[] };

export function NotificationsBell({ initial }: Props) {
  // Inicializa do server prop; quando user marca read, atualizamos local.
  // router.refresh() pelo server action vai re-renderizar a página com novos
  // dados (a key changes via useState reset garante hidratação correta).
  const [items, setItems] = useState(initial);
  const [pending, startTransition] = useTransition();
  const unread = items.filter((n) => !n.read_at).length;

  function markRead(id: string) {
    startTransition(async () => {
      const r = await markNotificationReadAction({ notification_id: id });
      if (r.ok) {
        setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read_at: r.read_at } : n)));
      }
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="relative inline-flex items-center justify-center rounded-md p-1.5 transition-colors hover:bg-zinc-100 focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:outline-none dark:hover:bg-zinc-800">
        <BellIcon className="size-4" />
        {unread > 0 ? (
          <span className="absolute -top-0.5 -right-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-medium text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        ) : null}
        <span className="sr-only">Notificações</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel>Notificações</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {items.length === 0 ? (
          <p className="px-3 py-4 text-center text-xs text-zinc-500">Sem notificações.</p>
        ) : (
          <ul className="max-h-80 overflow-y-auto py-1">
            {items.map((n) => (
              <li key={n.id}>
                <Link
                  href={n.link_url ?? "#"}
                  onClick={() => !n.read_at && markRead(n.id)}
                  className={`block px-3 py-2 text-sm transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800 ${
                    n.read_at ? "opacity-60" : "border-l-2 border-zinc-900 dark:border-zinc-100"
                  }`}
                >
                  <p className="font-medium">{n.title}</p>
                  {n.body ? (
                    <p className="mt-0.5 line-clamp-2 text-xs text-zinc-600 dark:text-zinc-400">
                      {n.body}
                    </p>
                  ) : null}
                  <p className="mt-1 text-[10px] text-zinc-500">
                    {new Date(n.created_at).toLocaleString("pt-BR")}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
        {pending ? <p className="px-3 py-1 text-[10px] text-zinc-500">Atualizando…</p> : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
