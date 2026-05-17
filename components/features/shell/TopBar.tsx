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

type Props = {
  userEmail: string;
  orgName: string;
  role: "owner" | "admin" | "member";
};

const ROLE_LABEL: Record<Props["role"], string> = {
  owner: "Owner",
  admin: "Admin",
  member: "Membro",
};

export function TopBar({ userEmail, orgName, role }: Props) {
  const initials = userEmail.slice(0, 2).toUpperCase();
  const [pending, startTransition] = useTransition();

  return (
    <header className="flex h-14 items-center justify-between border-b border-zinc-200 bg-white px-4 md:px-6 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="text-sm text-zinc-500">
        {orgName} <span className="text-zinc-400">·</span> {ROLE_LABEL[role]}
      </div>

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
    </header>
  );
}
