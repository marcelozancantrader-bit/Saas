import type { ReactNode } from "react";
import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { buttonVariants } from "@/components/ui/button";

export const metadata = {
  title: "Ferramentas grátis — Memorial.ai",
  description:
    "Calculadoras gratuitas para arquitetos e engenheiros brasileiros: orçamento SINAPI, honorário CAU, CUB regional. Sem cadastro.",
};

export default function FerramentasLayout({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-screen bg-white text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50">
      <header className="sticky top-0 z-30 border-b border-zinc-200 bg-white/80 backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-950/80">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6">
          <Link href="/" aria-label="Memorial.ai" className="inline-flex items-center gap-2">
            <Logo size={26} />
            <span className="text-base font-semibold">Memorial.ai</span>
            <span className="hidden text-xs text-zinc-500 sm:inline">/ Ferramentas</span>
          </Link>
          <nav className="flex items-center gap-3 text-sm">
            <Link
              href="/ferramentas"
              className="hidden text-zinc-700 hover:underline sm:inline dark:text-zinc-300"
            >
              Todas
            </Link>
            <Link href="/" className="text-zinc-700 hover:underline dark:text-zinc-300">
              Sobre o Memorial.ai
            </Link>
            <Link href="/signup" className={buttonVariants({ size: "sm" })}>
              Criar conta grátis
            </Link>
          </nav>
        </div>
      </header>
      {children}
      <footer className="mt-16 border-t border-zinc-200 dark:border-zinc-800">
        <div className="mx-auto max-w-5xl px-4 py-8 text-center text-xs text-zinc-500 sm:px-6">
          <p>
            Ferramentas gratuitas oferecidas por{" "}
            <Link href="/" className="font-medium text-blue-600 hover:underline">
              Memorial.ai
            </Link>{" "}
            — copiloto de IA para arquitetos e engenheiros brasileiros. Cálculos referenciais —
            confirme valores com fonte oficial antes de publicar.
          </p>
        </div>
      </footer>
    </main>
  );
}
