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
import { cancelTrialAction } from "@/server/actions/billing/cancel-trial.action";

export function CancelTrialButton({ daysRemaining }: { daysRemaining: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleConfirm() {
    startTransition(async () => {
      const r = await cancelTrialAction();
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success("Trial cancelado. Workspace voltou pro Free.");
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        className="text-xs text-blue-900 hover:bg-blue-100 dark:text-blue-200 dark:hover:bg-blue-900/40"
      >
        Cancelar trial
      </Button>

      <Dialog open={open} onOpenChange={(v) => !pending && setOpen(v)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Cancelar trial agora?</DialogTitle>
            <DialogDescription>
              Faltam {daysRemaining} {daysRemaining === 1 ? "dia" : "dias"} pro fim natural. Se
              cancelar agora, o workspace volta imediatamente pro plano Free e você perde acesso às
              features Pro até assinar.
              <br />
              <br />
              <strong>Importante</strong>: seus projetos e documentos ficam intactos. E você não
              pode reiniciar o trial — é 1 por workspace.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
              Manter trial
            </Button>
            <Button variant="destructive" onClick={handleConfirm} disabled={pending}>
              {pending ? "Cancelando…" : "Sim, cancelar agora"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
