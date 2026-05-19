import type { ReactNode } from "react";
import Link from "next/link";
import { Logo } from "@/components/brand/Logo";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 dark:bg-zinc-950">
      <div className="flex flex-1 flex-col items-center justify-center px-4 py-12">
        <Link
          href="/"
          aria-label="Voltar para a página inicial"
          className="mb-8 inline-flex items-center gap-2"
        >
          <Logo size={32} />
          <span className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Memorial.ai
          </span>
        </Link>
        <div className="w-full max-w-md">{children}</div>
        <p className="mt-8 text-center text-sm text-zinc-500">
          Da planta ao contrato em horas, não semanas.
        </p>
      </div>
    </div>
  );
}
