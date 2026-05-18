"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { updateBudgetAction } from "@/server/actions/budgets/update-budget.action";
import { deleteBudgetAction } from "@/server/actions/budgets/delete-budget.action";
import { DeleteButton } from "@/components/features/shell/DeleteButton";
import { toast } from "sonner";

type Budget = {
  id: string;
  project_id: string;
  bdi_pct: string;
  observacoes: string | null;
  status: "rascunho" | "finalizado";
};

export function BudgetHeader({ budget }: { budget: Budget }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [bdi, setBdi] = useState(Number(budget.bdi_pct).toFixed(2));
  const [observacoes, setObservacoes] = useState(budget.observacoes ?? "");

  function saveBdi() {
    startTransition(async () => {
      const r = await updateBudgetAction({
        budget_id: budget.id,
        bdi_pct: Number(bdi),
      });
      if (r.ok) {
        toast.success("BDI atualizado");
        router.refresh();
      } else {
        toast.error(r.error);
      }
    });
  }

  function saveObservacoes() {
    startTransition(async () => {
      const r = await updateBudgetAction({
        budget_id: budget.id,
        observacoes,
      });
      if (r.ok) {
        toast.success("Observações salvas");
        router.refresh();
      } else {
        toast.error(r.error);
      }
    });
  }

  function toggleStatus() {
    const newStatus = budget.status === "finalizado" ? "rascunho" : "finalizado";
    startTransition(async () => {
      const r = await updateBudgetAction({ budget_id: budget.id, status: newStatus });
      if (r.ok) {
        toast.success(newStatus === "finalizado" ? "Orçamento finalizado" : "Voltou a rascunho");
        router.refresh();
      } else {
        toast.error(r.error);
      }
    });
  }

  const handleDelete = async () => {
    return await deleteBudgetAction(budget.id);
  };

  return (
    <div className="flex flex-wrap items-end gap-4 rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-end gap-2">
        <div className="space-y-1.5">
          <Label htmlFor="bdi">BDI (%)</Label>
          <Input
            id="bdi"
            type="number"
            step="0.5"
            min="0"
            max="100"
            value={bdi}
            onChange={(e) => setBdi(e.target.value)}
            disabled={pending}
            className="w-24"
          />
        </div>
        <Button onClick={saveBdi} disabled={pending} size="sm">
          Recalcular
        </Button>
      </div>

      <div className="min-w-[280px] flex-1 space-y-1.5">
        <Label htmlFor="obs">Observações</Label>
        <Textarea
          id="obs"
          rows={2}
          value={observacoes}
          onChange={(e) => setObservacoes(e.target.value)}
          onBlur={saveObservacoes}
          disabled={pending}
        />
      </div>

      <div className="flex items-end gap-2">
        <Button variant="outline" onClick={toggleStatus} disabled={pending} size="sm">
          {budget.status === "finalizado" ? "Voltar a rascunho" : "Finalizar"}
        </Button>
        <DeleteButton
          label="Excluir versão"
          confirmTitle="Excluir orçamento?"
          confirmDescription="Esta versão e todos os seus itens serão removidos permanentemente."
          onConfirm={handleDelete}
          redirectAfterSuccess={`/projetos/${budget.project_id}/orcamento`}
          successMessage="Orçamento excluído"
          variant="outline"
          size="sm"
        />
      </div>
    </div>
  );
}
