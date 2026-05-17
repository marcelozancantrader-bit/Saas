import type { ReactNode } from "react";
import Link from "next/link";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 dark:bg-zinc-950">
      <div className="flex flex-1 flex-col items-center justify-center px-4 py-12">
        <Link
          href="/login"
          className="mb-8 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50"
        >
          Memorial<span className="text-zinc-500">.ai</span>
        </Link>
        <div className="w-full max-w-md">{children}</div>
        <p className="mt-8 text-center text-xs text-zinc-500">
          Da planta ao contrato em horas, não semanas.
        </p>
      </div>
    </div>
  );
}
