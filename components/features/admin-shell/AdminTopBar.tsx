"use client";

import { useTransition } from "react";
import { LogOut, AlertTriangle } from "lucide-react";
import { logoutAction } from "@/server/actions/auth/logout.action";

type Props = {
  userEmail: string;
};

export function AdminTopBar({ userEmail }: Props) {
  const [pending, startTransition] = useTransition();

  return (
    <header className="flex h-14 items-center justify-between border-b border-zinc-800 bg-zinc-950 px-4 text-zinc-100 md:px-6">
      <div className="flex items-center gap-2 text-xs">
        <AlertTriangle className="h-4 w-4 text-amber-400" />
        <span className="text-amber-400">Modo administrativo — ações afetam toda a plataforma</span>
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
