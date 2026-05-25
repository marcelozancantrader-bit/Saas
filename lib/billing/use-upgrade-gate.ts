"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";
import type { ActionFailure, UpgradeRequirement } from "@/lib/billing/upgrade-gate";

type ActionSuccess = { ok: true } & Record<string, unknown>;
type ActionResult = ActionSuccess | ActionFailure;

type UseUpgradeGateReturn = {
  /** Requirement do último upgrade bloqueado; null se nenhum aberto. */
  requirement: UpgradeRequirement | null;
  /** Se UpgradeGateDialog deve estar aberto. */
  open: boolean;
  /** Fecha o dialog. */
  onClose: () => void;
  /**
   * Processa o resultado de uma server action.
   * - `ok: true` → retorna `true` (caller continua com sucesso)
   * - `ok: false` com `upgrade` → abre dialog rico, retorna `false`
   * - `ok: false` sem `upgrade` → dispara `toast.error(error)`, retorna `false`
   *
   * Type guard: estreita `result` pra `Extract<R, { ok: true }>` no caller.
   */
  handle: <R extends ActionResult>(result: R) => result is Extract<R, { ok: true }>;
};

/**
 * Hook que gerencia o estado do UpgradeGateDialog.
 *
 * Uso típico:
 *
 *   const gate = useUpgradeGate();
 *   const r = await someAction(...);
 *   if (!gate.handle(r)) return;
 *   toast.success("ok");
 *
 *   <UpgradeGateDialog
 *     open={gate.open}
 *     onClose={gate.onClose}
 *     requirement={gate.requirement}
 *   />
 */
export function useUpgradeGate(): UseUpgradeGateReturn {
  const [requirement, setRequirement] = useState<UpgradeRequirement | null>(null);

  const handle = useCallback(
    <R extends ActionResult>(result: R): result is Extract<R, { ok: true }> => {
      if (result.ok) return true;
      if (result.upgrade) {
        setRequirement(result.upgrade);
      } else {
        toast.error(result.error);
      }
      return false;
    },
    [],
  );

  const onClose = useCallback(() => setRequirement(null), []);

  return {
    requirement,
    open: requirement !== null,
    onClose,
    handle,
  };
}
