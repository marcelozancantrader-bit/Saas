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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { changeOrgPlanAction } from "@/server/actions/admin/change-org-plan.action";
import { PLAN_ORDER, PLANS, type PlanId, formatBrlFromCents } from "@/lib/plans/limits";

type Props = {
  orgId: string;
  currentPlan: PlanId;
};

export function ChangePlanDialog({ orgId, currentPlan }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [newPlan, setNewPlan] = useState<PlanId>(currentPlan);
  const [reason, setReason] = useState("");
  const [pending, startTransition] = useTransition();

  function handleSubmit() {
    if (newPlan === currentPlan) {
      toast.error("Selecione um plano diferente do atual.");
      return;
    }
    if (reason.trim().length < 3) {
      toast.error("Motivo é obrigatório (mín. 3 caracteres).");
      return;
    }
    startTransition(async () => {
      const r = await changeOrgPlanAction({ org_id: orgId, new_plan: newPlan, reason });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success(`Plano alterado para ${PLANS[newPlan].label}`);
      setOpen(false);
      setReason("");
      router.refresh();
    });
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        Mudar plano
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Alterar plano da organização</DialogTitle>
            <DialogDescription>
              Mudança manual sem cobrança. Cria subscription com{" "}
              <code className="rounded bg-zinc-800 px-1 text-zinc-200">provider=manual</code> e
              registra no audit log.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="new_plan">Novo plano</Label>
              <select
                id="new_plan"
                value={newPlan}
                onChange={(e) => setNewPlan(e.target.value as PlanId)}
                className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-2 py-1.5 text-sm text-zinc-100 focus:border-amber-500 focus:outline-none"
              >
                {PLAN_ORDER.map((p) => (
                  <option key={p} value={p}>
                    {PLANS[p].label} — {formatBrlFromCents(PLANS[p].priceCents)}
                    {p === currentPlan ? " (atual)" : ""}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="reason">Motivo</Label>
              <Textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Ex.: cliente em piloto pago manualmente via PIX, upgrade cortesia, etc."
                rows={3}
                maxLength={500}
              />
              <p className="text-xs text-zinc-500">
                Fica no audit log permanente. Seja específico.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={pending}>
              {pending ? "Aplicando…" : "Aplicar mudança"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
