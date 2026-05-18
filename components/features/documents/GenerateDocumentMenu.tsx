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

const TIPOS: DocumentTipo[] = [
  "memorial",
  "caderno",
  "proposta",
  "contrato",
  "memorial_estrutural",
  "memorial_hidrossanitario",
  "memorial_eletrico",
  "ppci",
  "impermeabilizacao",
  "cronograma",
];

const REQUIRES_EXTRACTION: Record<DocumentTipo, boolean> = {
  memorial: true,
  caderno: true,
  proposta: false,
  contrato: false,
  memorial_estrutural: true,
  memorial_hidrossanitario: true,
  memorial_eletrico: true,
  ppci: true,
  impermeabilizacao: true,
  cronograma: false,
};

const HINTS: Record<DocumentTipo, string> = {
  memorial: "Memorial geral (NBR 12.722)",
  caderno: "Caderno técnico por sistema",
  proposta: "Proposta comercial pro cliente",
  contrato: "Contrato com cláusulas de aditivo",
  memorial_estrutural: "Estrutural (NBR 6118, 6122)",
  memorial_hidrossanitario: "Água, esgoto, pluviais (NBR 5626, 8160)",
  memorial_eletrico: "Instalações elétricas (NBR 5410)",
  ppci: "Combate a incêndio (NBRs + IT do CB)",
  impermeabilizacao: "Impermeabilização (NBR 9575, 9574)",
  cronograma: "Cronograma físico-financeiro por etapas",
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
      <DropdownMenuContent align="end" className="max-h-[60vh] w-80 overflow-y-auto">
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
                <span className="text-xs text-zinc-500">
                  {needsExtraction ? "Confirme a extração da planta primeiro" : HINTS[tipo]}
                </span>
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
