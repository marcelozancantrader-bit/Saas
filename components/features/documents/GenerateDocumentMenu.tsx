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
import { ContractTemplateDialog } from "./ContractTemplateDialog";
import { toast } from "sonner";
import { useUpgradeGate } from "@/lib/billing/use-upgrade-gate";
import { UpgradeGateDialog } from "@/components/features/billing/UpgradeGateDialog";

type Props = {
  projectId: string;
  hasConfirmedExtraction: boolean;
  hasClient: boolean;
};

/** Documentos comerciais que precisam do cliente cadastrado (contratante). */
const REQUIRES_CLIENT: Record<DocumentTipo, boolean> = {
  memorial: false,
  caderno: false,
  proposta: true, // proposta tem o nome do cliente
  contrato: true, // contratante é peça central
  memorial_estrutural: false,
  memorial_hidrossanitario: false,
  memorial_eletrico: false,
  ppci: false,
  impermeabilizacao: false,
  cronograma: false,
};

type DocGroup = {
  label: string;
  tipos: DocumentTipo[];
};

const GROUPS: DocGroup[] = [
  {
    label: "Memoriais gerais",
    tipos: ["memorial", "caderno"],
  },
  {
    label: "Comercial",
    tipos: ["proposta", "contrato", "cronograma"],
  },
  {
    label: "Memoriais técnicos",
    tipos: [
      "memorial_estrutural",
      "memorial_hidrossanitario",
      "memorial_eletrico",
      "ppci",
      "impermeabilizacao",
    ],
  },
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
  proposta: "Para o cliente — visual + comercial",
  contrato: "Com cláusulas de aditivo e revisão",
  memorial_estrutural: "Fundação, vigas, pilares, lajes (NBR 6118)",
  memorial_hidrossanitario: "Água, esgoto, pluviais (NBR 5626, 8160)",
  memorial_eletrico: "Quadro, circuitos, pontos (NBR 5410)",
  ppci: "Extintores, saídas, sinalização",
  impermeabilizacao: "Banheiros, lajes, sacadas (NBR 9575)",
  cronograma: "Etapas de obra + % desembolso",
};

export function GenerateDocumentMenu({ projectId, hasConfirmedExtraction, hasClient }: Props) {
  const router = useRouter();
  const [generating, setGenerating] = useState<DocumentTipo | null>(null);
  const [, startTransition] = useTransition();
  const [contractDialogOpen, setContractDialogOpen] = useState(false);
  const gate = useUpgradeGate();

  function onGenerate(tipo: DocumentTipo) {
    // Contrato abre dialog de escolha de template antes de gerar.
    if (tipo === "contrato") {
      setContractDialogOpen(true);
      return;
    }
    setGenerating(tipo);
    startTransition(async () => {
      const result = await generateDocumentAction({ project_id: projectId, tipo });
      setGenerating(null);
      if (!gate.handle(result)) return;
      toast.success(`${DOCUMENT_LABELS[tipo]} gerado pela IA`);
      router.push(`/projetos/${projectId}/documentos/${result.document_id}`);
    });
  }

  return (
    <>
      <UpgradeGateDialog open={gate.open} onClose={gate.onClose} requirement={gate.requirement} />
      <ContractTemplateDialog
        projectId={projectId}
        open={contractDialogOpen}
        onClose={() => setContractDialogOpen(false)}
      />
      <DropdownMenu>
        <DropdownMenuTrigger
          className="bg-primary text-primary-foreground hover:bg-primary/80 inline-flex h-8 items-center gap-1.5 rounded-lg border border-transparent px-3 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50"
          disabled={generating !== null}
        >
          {generating ? `Gerando ${DOCUMENT_LABELS[generating]}…` : "Gerar documento por IA"}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="max-h-[70vh] w-80 overflow-y-auto">
          {GROUPS.map((group, gi) => (
            <div key={group.label}>
              {gi > 0 ? <DropdownMenuSeparator /> : null}
              <DropdownMenuLabel>{group.label}</DropdownMenuLabel>
              {group.tipos.map((tipo) => {
                const needsExtraction = REQUIRES_EXTRACTION[tipo] && !hasConfirmedExtraction;
                const needsClient = REQUIRES_CLIENT[tipo] && !hasClient;
                const blocked = needsExtraction || needsClient;
                const blockReason = needsClient
                  ? "Vincule um cliente ao projeto primeiro"
                  : needsExtraction
                    ? "Confirme a extração da planta primeiro"
                    : null;
                return (
                  <DropdownMenuItem
                    key={tipo}
                    disabled={blocked || generating !== null}
                    onClick={() => onGenerate(tipo)}
                  >
                    <div className="flex flex-col">
                      <span className="font-medium">{DOCUMENT_LABELS[tipo]}</span>
                      <span className="text-xs text-zinc-500">{blockReason ?? HINTS[tipo]}</span>
                    </div>
                  </DropdownMenuItem>
                );
              })}
            </div>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </>
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
