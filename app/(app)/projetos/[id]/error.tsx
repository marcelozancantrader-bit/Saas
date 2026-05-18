"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

/**
 * Error boundary for /projetos/[id]/* — surfaces the actual stack trace instead of
 * letting Edge show its generic "This page couldn't load" page.
 */
export default function ProjectDetailError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log to console so the user can copy/paste from DevTools
    console.error("[projetos/[id] error boundary]", error);
  }, [error]);

  return (
    <div className="space-y-4 rounded-lg border border-red-200 bg-red-50 p-6 text-sm dark:border-red-900 dark:bg-red-950">
      <div>
        <h2 className="text-lg font-semibold text-red-900 dark:text-red-100">
          Erro ao carregar projeto
        </h2>
        <p className="mt-1 text-red-700 dark:text-red-300">
          A página crashou durante a renderização. Abaixo está o que o servidor capturou — me passe
          este texto e o Vercel digest abaixo para eu corrigir.
        </p>
      </div>

      <details className="rounded-md border border-red-300 bg-white p-3 dark:border-red-800 dark:bg-zinc-900">
        <summary className="cursor-pointer text-xs font-medium">Detalhes do erro</summary>
        <pre className="mt-2 max-h-72 overflow-auto text-xs whitespace-pre-wrap">
          {`name:    ${error.name}\nmessage: ${error.message}${error.digest ? `\ndigest:  ${error.digest}` : ""}\n\nstack:\n${error.stack ?? "(sem stack)"}`}
        </pre>
      </details>

      <div className="flex gap-2">
        <Button onClick={reset} size="sm">
          Tentar novamente
        </Button>
        <Button variant="outline" size="sm" onClick={() => (window.location.href = "/projetos")}>
          Voltar para Projetos
        </Button>
      </div>
    </div>
  );
}
