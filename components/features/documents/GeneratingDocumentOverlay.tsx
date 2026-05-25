"use client";

import { useEffect, useState } from "react";
import { Loader2, Sparkles } from "lucide-react";

type Props = {
  /** Label do documento sendo gerado (ex: "Memorial descritivo"). null = não mostra. */
  tipoLabel: string | null;
};

/**
 * Overlay flutuante mostrado quando IA está gerando um documento.
 *
 * Geração pode levar 60-180s (depende de tipo e contexto). Antes deste overlay,
 * usuário via só "Gerando…" no botão e ficava sem certeza se algo travou.
 */
export function GeneratingDocumentOverlay({ tipoLabel }: Props) {
  if (tipoLabel === null) return null;
  // key reseta o filho a cada nova geração (zera timer sem setState em effect)
  return <Overlay key={tipoLabel} tipoLabel={tipoLabel} />;
}

function Overlay({ tipoLabel }: { tipoLabel: string }) {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const elapsed = minutes > 0 ? `${minutes}m ${secs.toString().padStart(2, "0")}s` : `${secs}s`;

  const phase =
    seconds < 15
      ? "Lendo dados do projeto"
      : seconds < 60
        ? "Analisando NBR e normas aplicáveis"
        : seconds < 120
          ? "Escrevendo seções do documento"
          : "Finalizando — quase lá";

  return (
    <div
      className="fixed right-4 bottom-4 z-50 max-w-xs rounded-lg border border-blue-300 bg-blue-50/95 p-4 shadow-lg backdrop-blur-sm dark:border-blue-900/40 dark:bg-blue-950/90"
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <div className="flex items-start gap-3">
        <div className="relative shrink-0">
          <Sparkles className="h-5 w-5 text-blue-600 dark:text-blue-400" aria-hidden />
          <Loader2 className="absolute -right-1 -bottom-1 h-3 w-3 animate-spin text-blue-500 dark:text-blue-400" />
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <p className="text-sm font-semibold text-blue-900 dark:text-blue-100">
            Gerando {tipoLabel}
          </p>
          <p className="text-xs text-blue-800 dark:text-blue-200">{phase}…</p>
          <p className="text-[11px] text-blue-700/80 dark:text-blue-300/80">
            {elapsed} decorrido · pode levar até 2 minutos
          </p>
        </div>
      </div>
    </div>
  );
}
