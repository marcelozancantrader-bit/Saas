"use client";

import { Button } from "@/components/ui/button";
import { RegenerateBudgetButton } from "@/components/features/budgets/RegenerateBudgetButton";

type Props = { projectId: string; canGenerate: boolean };

/**
 * Botão principal para gerar orçamento na página de listagem.
 * Quando habilitado, abre o mesmo dialog do RegenerateBudgetButton (com BDI/UF/regime
 * editáveis). Quando desabilitado, mostra botão cinza tooltipless.
 */
export function GenerateBudgetButton({ projectId, canGenerate }: Props) {
  if (!canGenerate) {
    return (
      <Button disabled variant="default">
        Gerar orçamento
      </Button>
    );
  }
  return (
    <RegenerateBudgetButton
      projectId={projectId}
      variant="default"
      label="Gerar orçamento"
      defaults={{ uf: "SP", mes_referencia: "2026-05-01", desonerado: true, bdi_pct: 28 }}
    />
  );
}
