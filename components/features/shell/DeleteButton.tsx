"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";

type Props = {
  label?: string;
  confirmTitle: string;
  confirmDescription: string;
  onConfirm: () => Promise<{ ok: true } | { ok: false; error: string } | void>;
  variant?: "destructive" | "outline";
  size?: "sm" | "default";
};

export function DeleteButton({
  label = "Excluir",
  confirmTitle,
  confirmDescription,
  onConfirm,
  variant = "destructive",
  size = "default",
}: Props) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function handle() {
    startTransition(async () => {
      const result = await onConfirm();
      if (result && "ok" in result && !result.ok) {
        toast.error(result.error);
      } else {
        setOpen(false);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant={variant} size={size}>
            {label}
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{confirmTitle}</DialogTitle>
          <DialogDescription>{confirmDescription}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
            Cancelar
          </Button>
          <Button variant="destructive" onClick={handle} disabled={pending}>
            {pending ? "Excluindo…" : "Confirmar exclusão"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
