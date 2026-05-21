"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { generateBudgetAction } from "@/server/actions/budgets/generate.action";
import { toast } from "sonner";

type Props = {
  projectId: string;
  canGenerate: boolean;
  /** UF do projeto (extraído do endereço). Default SP se não detectado. */
  uf: string;
  /** Mês de referência SINAPI mais recente disponível pra essa UF. */
  mesReferencia: string;
  /** UF tem dados SINAPI cadastrados no banco. Se false, mostra erro ao clicar. */
  ufHasData: boolean;
};

/**
 * Botão principal de "Gerar orçamento" — vai DIRETO usando os parâmetros do
 * projeto (UF do endereço, mês mais recente, BDI 28%, regime desonerado).
 *
 * Pra mudar parâmetros, o usuário usa o botão "Regerar" na página do orçamento.
 * Esse design reduz fricção: 1 clique pra criar o primeiro orçamento.
 */
export function GenerateBudgetButton({
  projectId,
  canGenerate,
  uf,
  mesReferencia,
  ufHasData,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState(false);

  if (!canGenerate) {
    return (
      <Button disabled variant="default">
        Gerar orçamento
      </Button>
    );
  }

  function handle() {
    if (!ufHasData) {
      toast.error(
        `Não há dados SINAPI cadastrados para ${uf}. Solicite ao admin que atualize a base via /admin/sinapi.`,
      );
      return;
    }

    startTransition(async () => {
      const result = await generateBudgetAction({
        project_id: projectId,
        uf,
        mes_referencia: mesReferencia,
        desonerado: true,
        bdi_pct: 28,
      });
      if (result.ok) {
        setDone(true);
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
    <Button onClick={handle} disabled={pending || done} variant="default">
      {pending ? "Gerando…" : done ? "Gerado ✓" : "Gerar orçamento"}
    </Button>
  );
}
