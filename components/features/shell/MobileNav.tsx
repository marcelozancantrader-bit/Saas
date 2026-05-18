"use client";

import { useEffect, useState } from "react";
import { MenuIcon, XIcon } from "lucide-react";
import { SidebarContent } from "./SidebarContent";

type Props = { orgName: string };

/**
 * MobileNav (<md): botão hamburger no canto esquerdo do TopBar +
 * drawer slide-from-left com os mesmos links do Sidebar desktop.
 *
 * Bloqueia scroll do body quando aberto e fecha com:
 * - clique no backdrop
 * - tecla Escape
 * - clique em qualquer link do menu
 */
export function MobileNav({ orgName }: Props) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-9 w-9 items-center justify-center rounded-md text-zinc-700 transition-colors hover:bg-zinc-100 focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:outline-none md:hidden dark:text-zinc-300 dark:hover:bg-zinc-800"
        aria-label="Abrir menu"
      >
        <MenuIcon className="size-5" />
      </button>

      <div
        className={`fixed inset-0 z-40 bg-black/50 backdrop-blur-[2px] transition-opacity md:hidden ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={() => setOpen(false)}
        aria-hidden="true"
      />

      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 flex w-64 flex-col border-r border-zinc-200 bg-white shadow-xl transition-transform md:hidden dark:border-zinc-800 dark:bg-zinc-900 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="Menu de navegação"
      >
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="absolute top-3 right-3 inline-flex h-8 w-8 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          aria-label="Fechar menu"
        >
          <XIcon className="size-4" />
        </button>
        <SidebarContent orgName={orgName} onNavigate={() => setOpen(false)} />
      </aside>
    </>
  );
}
