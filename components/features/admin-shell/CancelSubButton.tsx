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
import { cancelSubscriptionAction } from "@/server/actions/admin/cancel-subscription.action";

type Props = {
  subId: string;
};

export function CancelSubButton({ subId }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [pending, startTransition] = useTransition();

  function handleSubmit() {
    if (reason.trim().length < 3) {
      toast.error("Motivo é obrigatório (mín. 3 caracteres).");
      return;
    }
    startTransition(async () => {
      const r = await cancelSubscriptionAction({ sub_id: subId, reason });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success("Subscription cancelada.");
      setOpen(false);
      setReason("");
      router.refresh();
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs text-rose-300 hover:underline"
      >
        Cancelar
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancelar subscription manualmente</DialogTitle>
            <DialogDescription>
              Marca a subscription como <code className="text-zinc-200">canceled</code> no banco.
              <strong className="mt-1 block text-amber-300">
                Não cancela no Asaas — pra parar a cobrança real, faça pelo painel Asaas também.
              </strong>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-1.5">
            <Label htmlFor="cancel_reason">Motivo</Label>
            <Textarea
              id="cancel_reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ex.: cliente solicitou cancelamento, fraude detectada, etc."
              rows={3}
              maxLength={500}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
              Voltar
            </Button>
            <Button onClick={handleSubmit} disabled={pending}>
              {pending ? "Cancelando…" : "Confirmar cancelamento"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
