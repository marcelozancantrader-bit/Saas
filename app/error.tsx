"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { Logo } from "@/components/brand/Logo";

type Props = {
  error: Error & { digest?: string };
  reset: () => void;
};

/**
 * Error boundary global. O Next renderiza isso quando algo em um Server Component
 * lança e nada mais captura. Mantém branding e dá ao usuário um caminho de saída.
 */
export default function GlobalError({ error, reset }: Props) {
  useEffect(() => {
    // Server-side já loga via Sentry stub; client-side ao menos console.
    console.error("Unhandled error:", error);
  }, [error]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-white px-4 text-center dark:bg-zinc-950">
      <Link href="/" aria-label="Memorial.ai" className="inline-flex items-center gap-2">
        <Logo size={28} />
        <span className="text-base font-semibold">Memorial.ai</span>
      </Link>
      <p className="mt-12 text-5xl font-bold tracking-tight text-red-600 dark:text-red-400">!</p>
      <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">Algo deu errado</h1>
      <p className="mx-auto mt-3 max-w-md text-base text-zinc-600 dark:text-zinc-400">
        Encontramos um erro inesperado. Já registramos o ocorrido. Tente recarregar a página ou
        voltar pro início.
      </p>
      {error?.digest ? (
        <p className="mt-3 font-mono text-xs text-zinc-400">ID: {error.digest}</p>
      ) : null}
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Button size="lg" onClick={reset}>
          Tentar novamente
        </Button>
        <Link href="/" className={buttonVariants({ size: "lg", variant: "outline" })}>
          Voltar para o início
        </Link>
      </div>
    </main>
  );
}
