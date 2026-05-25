"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Sparkles, CheckCircle2 } from "lucide-react";
import { generateDocumentAction } from "@/server/actions/documents/generate.action";
import { CONTRACT_TEMPLATES, type ContractTemplateId } from "@/lib/contract-templates/templates";
import { useUpgradeGate } from "@/lib/billing/use-upgrade-gate";
import { UpgradeGateDialog } from "@/components/features/billing/UpgradeGateDialog";
import { GeneratingDocumentOverlay } from "./GeneratingDocumentOverlay";

type Props = {
  projectId: string;
  open: boolean;
  onClose: () => void;
};

export function ContractTemplateDialog({ projectId, open, onClose }: Props) {
  const router = useRouter();
  const [selected, setSelected] = useState<ContractTemplateId | null>(null);
  const [generating, startGenerate] = useTransition();
  const gate = useUpgradeGate();

  function handleClose() {
    if (generating) return;
    setSelected(null);
    onClose();
  }

  function doGenerate() {
    if (!selected) {
      toast.error("Escolha um template antes de gerar.");
      return;
    }
    startGenerate(async () => {
      const r = await generateDocumentAction({
        project_id: projectId,
        tipo: "contrato",
        contract_template_id: selected,
      });
      if (!gate.handle(r)) return;
      toast.success("Contrato gerado pela IA");
      router.push(`/projetos/${projectId}/documentos/${r.document_id}`);
      handleClose();
    });
  }

  return (
    <>
      <UpgradeGateDialog open={gate.open} onClose={gate.onClose} requirement={gate.requirement} />
      <GeneratingDocumentOverlay tipoLabel={generating ? "Contrato" : null} />
      <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              Gerar contrato — escolha um template
            </DialogTitle>
            <DialogDescription>
              O template direciona escopo, prazos e cláusulas específicas. A IA usa o template como
              ponto de partida e personaliza com os dados do projeto e cliente.
            </DialogDescription>
          </DialogHeader>

          <div className="grid max-h-[60vh] gap-2 overflow-y-auto sm:grid-cols-2">
            {CONTRACT_TEMPLATES.map((tpl) => {
              const isSelected = selected === tpl.id;
              return (
                <button
                  key={tpl.id}
                  type="button"
                  onClick={() => setSelected(tpl.id)}
                  disabled={generating}
                  className={`flex flex-col items-start gap-1.5 rounded-lg border p-3 text-left transition ${
                    isSelected
                      ? "border-blue-500 bg-blue-50 ring-2 ring-blue-200 dark:border-blue-500 dark:bg-blue-950/30 dark:ring-blue-900/40"
                      : "border-zinc-200 bg-white hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700 dark:hover:bg-zinc-900/60"
                  }`}
                  aria-pressed={isSelected}
                >
                  <div className="flex w-full items-start justify-between gap-2">
                    <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                      {tpl.nome}
                    </p>
                    {isSelected ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />
                    ) : null}
                  </div>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400">{tpl.descricaoCurta}</p>
                  <p className="text-[11px] text-zinc-500 italic">
                    <span className="font-medium not-italic">Ideal pra:</span> {tpl.ideal}
                  </p>
                  {tpl.cauReferencia ? (
                    <Badge variant="outline" className="mt-1 text-[10px]">
                      {tpl.cauReferencia}
                    </Badge>
                  ) : null}
                </button>
              );
            })}
          </div>

          <p className="text-xs text-zinc-500">
            O contrato gerado será um rascunho editável. Sempre revise antes de enviar ao cliente.
            Para obras grandes ou cláusulas atípicas, recomenda-se revisão por advogado.
          </p>

          <DialogFooter>
            <Button variant="outline" onClick={handleClose} disabled={generating}>
              Cancelar
            </Button>
            <Button onClick={doGenerate} disabled={!selected || generating}>
              {generating ? "Gerando contrato…" : "Gerar com este template"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
