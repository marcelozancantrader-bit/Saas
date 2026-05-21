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
import { suspendOrgAction, unsuspendOrgAction } from "@/server/actions/admin/suspend-org.action";

type Props = {
  orgId: string;
  isSuspended: boolean;
};

export function SuspendOrgDialog({ orgId, isSuspended }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [pending, startTransition] = useTransition();

  function handleSuspend() {
    if (reason.trim().length < 3) {
      toast.error("Motivo é obrigatório (mín. 3 caracteres).");
      return;
    }
    startTransition(async () => {
      const r = await suspendOrgAction({ org_id: orgId, reason });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success("Organização suspensa.");
      setOpen(false);
      setReason("");
      router.refresh();
    });
  }

  function handleUnsuspend() {
    startTransition(async () => {
      const r = await unsuspendOrgAction({ org_id: orgId });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success("Organização reativada.");
      setOpen(false);
      router.refresh();
    });
  }

  if (isSuspended) {
    return (
      <Button variant="outline" size="sm" onClick={() => handleUnsuspend()} disabled={pending}>
        {pending ? "Reativando…" : "Reativar"}
      </Button>
    );
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="border-rose-900/40 text-rose-300 hover:bg-rose-950/30"
      >
        Suspender
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Suspender organização</DialogTitle>
            <DialogDescription>
              A organização ficará marcada como suspensa no metadata. Hoje isso é informativo —
              bloqueio efetivo de login virá em fase futura. O audit log registra a ação.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-1.5">
            <Label htmlFor="suspend_reason">Motivo</Label>
            <Textarea
              id="suspend_reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ex.: fraude detectada, conta solicitada para deletar, abuso de termos."
              rows={3}
              maxLength={500}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
              Cancelar
            </Button>
            <Button onClick={handleSuspend} disabled={pending}>
              {pending ? "Suspendendo…" : "Confirmar suspensão"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
