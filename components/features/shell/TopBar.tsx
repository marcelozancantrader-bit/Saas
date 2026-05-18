"use client";

import { useTransition } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { logoutAction } from "@/server/actions/auth/logout.action";
import { NotificationsBell } from "./NotificationsBell";
import { MobileNav } from "./MobileNav";
import type { NotificationRow } from "@/server/services/notifications-load";

type Props = {
  userEmail: string;
  orgName: string;
  role: "owner" | "admin" | "member";
  notifications: NotificationRow[];
};

const ROLE_LABEL: Record<Props["role"], string> = {
  owner: "Owner",
  admin: "Admin",
  member: "Membro",
};

export function TopBar({ userEmail, orgName, role, notifications }: Props) {
  const initials = userEmail.slice(0, 2).toUpperCase();
  const [pending, startTransition] = useTransition();

  return (
    <header className="flex h-14 items-center justify-between gap-2 border-b border-zinc-200 bg-white px-2 md:px-6 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex min-w-0 items-center gap-1">
        <MobileNav orgName={orgName} />
        <div className="hidden truncate text-sm text-zinc-500 sm:block">
          <span className="truncate">{orgName}</span> <span className="text-zinc-400">·</span>{" "}
          {ROLE_LABEL[role]}
        </div>
      </div>

      <div className="flex items-center gap-1">
        <NotificationsBell initial={notifications} />

        <DropdownMenu>
          <DropdownMenuTrigger className="inline-flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-zinc-100 focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:outline-none dark:hover:bg-zinc-800">
            <Avatar className="h-6 w-6">
              <AvatarFallback className="text-xs">{initials}</AvatarFallback>
            </Avatar>
            <span className="hidden md:inline">{userEmail}</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="truncate">{userEmail}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem disabled>Conta (em breve)</DropdownMenuItem>
            <DropdownMenuItem disabled>Configurações da org (Sprint 1)</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              disabled={pending}
              onClick={() => startTransition(() => logoutAction())}
            >
              {pending ? "Saindo…" : "Sair"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
