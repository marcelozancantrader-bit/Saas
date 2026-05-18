"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { generateDocumentAction } from "@/server/actions/documents/generate.action";
import { DOCUMENT_LABELS, type DocumentTipo } from "@/lib/ai/generate-document";
import { toast } from "sonner";

type Props = { projectId: string; hasConfirmedExtraction: boolean };

const TIPOS: DocumentTipo[] = ["memorial", "caderno", "proposta", "contrato"];

const REQUIRES_EXTRACTION: Record<DocumentTipo, boolean> = {
  memorial: true,
  caderno: true,
  proposta: false,
  contrato: false,
};

export function GenerateDocumentMenu({ projectId, hasConfirmedExtraction }: Props) {
  const router = useRouter();
  const [generating, setGenerating] = useState<DocumentTipo | null>(null);
  const [, startTransition] = useTransition();

  function onGenerate(tipo: DocumentTipo) {
    setGenerating(tipo);
    startTransition(async () => {
      const result = await generateDocumentAction({ project_id: projectId, tipo });
      setGenerating(null);
      if (result.ok) {
        toast.success(`${DOCUMENT_LABELS[tipo]} gerado pela IA`);
        router.push(`/projetos/${projectId}/documentos/${result.document_id}`);
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="bg-primary text-primary-foreground hover:bg-primary/80 inline-flex h-8 items-center gap-1.5 rounded-lg border border-transparent px-3 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50"
        disabled={generating !== null}
      >
        {generating ? `Gerando ${DOCUMENT_LABELS[generating]}…` : "Gerar documento por IA"}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel>Escolha o tipo</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {TIPOS.map((tipo) => {
          const needsExtraction = REQUIRES_EXTRACTION[tipo] && !hasConfirmedExtraction;
          return (
            <DropdownMenuItem
              key={tipo}
              disabled={needsExtraction || generating !== null}
              onClick={() => onGenerate(tipo)}
            >
              <div className="flex flex-col">
                <span className="font-medium">{DOCUMENT_LABELS[tipo]}</span>
                {needsExtraction ? (
                  <span className="text-xs text-zinc-500">
                    Confirme a extração da planta primeiro
                  </span>
                ) : (
                  <span className="text-xs text-zinc-500">
                    {tipo === "memorial" || tipo === "caderno"
                      ? "Usa dados da extração"
                      : "Não depende da planta"}
                  </span>
                )}
              </div>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Re-export a button-shaped wrapper for the trigger
export function StyledTrigger({ children }: { children: React.ReactNode }) {
  return (
    <Button variant="default" size="sm">
      {children}
    </Button>
  );
}
