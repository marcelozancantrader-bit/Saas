"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { generateBudgetAction } from "@/server/actions/budgets/generate.action";
import { toast } from "sonner";

type Props = { projectId: string; canGenerate: boolean };

export function GenerateBudgetButton({ projectId, canGenerate }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handle() {
    startTransition(async () => {
      const result = await generateBudgetAction({
        project_id: projectId,
        uf: "SP",
        mes_referencia: "2026-05-01",
        desonerado: true,
        bdi_pct: 25,
      });
      if (result.ok) {
        toast.success(
          `Orçamento gerado — ${result.items_count} itens, R$ ${Number(result.total_com_bdi).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
        );
        router.push(`/projetos/${projectId}/orcamento/${result.budget_id}`);
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <Button onClick={handle} disabled={!canGenerate || pending}>
      {pending ? "Gerando…" : "Gerar orçamento"}
    </Button>
  );
}
