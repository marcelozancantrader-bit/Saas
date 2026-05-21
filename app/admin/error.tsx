"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AlertOctagon, RotateCcw, ChevronLeft } from "lucide-react";

type Props = {
  error: Error & { digest?: string };
  reset: () => void;
};

/**
 * Error boundary dedicado para /admin. Como esta área é interna do founder,
 * faz sentido mostrar o erro real (message + stack) em tela pra debugar.
 */
export default function AdminError({ error, reset }: Props) {
  useEffect(() => {
    console.error("[admin] Unhandled error:", error);
  }, [error]);

  return (
    <div className="space-y-6 text-zinc-100">
      <div className="flex items-center gap-2">
        <AlertOctagon className="h-6 w-6 text-rose-400" />
        <h1 className="text-2xl font-semibold text-white">Erro no painel admin</h1>
      </div>

      <div className="rounded-lg border border-rose-900/40 bg-rose-950/20 p-4 text-sm">
        <p className="font-medium text-rose-300">Mensagem do erro:</p>
        <pre className="mt-2 max-h-[200px] overflow-auto rounded bg-zinc-950 p-3 text-xs break-words whitespace-pre-wrap text-rose-200">
          {error?.message ?? "(sem mensagem)"}
        </pre>
      </div>

      {error?.digest && (
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/30 p-3 text-xs text-zinc-400">
          Digest: <code className="text-zinc-200">{error.digest}</code>
        </div>
      )}

      {error?.stack && (
        <details className="rounded-lg border border-zinc-800 bg-zinc-900/30 p-3 text-xs">
          <summary className="cursor-pointer text-zinc-400">Ver stack trace</summary>
          <pre className="mt-2 max-h-[400px] overflow-auto text-[11px] whitespace-pre-wrap text-zinc-500">
            {error.stack}
          </pre>
        </details>
      )}

      <div className="flex flex-wrap gap-2">
        <Button onClick={reset} variant="default">
          <RotateCcw className="mr-1.5 h-4 w-4" />
          Tentar novamente
        </Button>
        <Link href="/admin">
          <Button variant="outline">
            <ChevronLeft className="mr-1.5 h-4 w-4" />
            Voltar pro painel
          </Button>
        </Link>
        <Link href="/dashboard">
          <Button variant="outline">Voltar ao app</Button>
        </Link>
      </div>
    </div>
  );
}
