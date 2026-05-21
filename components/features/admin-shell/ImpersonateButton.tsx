"use client";

import { useState, useTransition } from "react";
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
import { impersonateUserAction } from "@/server/actions/admin/impersonate.action";
import { UserCog } from "lucide-react";

type Props = {
  userId: string;
  userEmail: string;
  isPlatformAdmin: boolean;
};

export function ImpersonateButton({ userId, userEmail, isPlatformAdmin }: Props) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [pending, startTransition] = useTransition();

  if (isPlatformAdmin) {
    return (
      <Button variant="outline" size="sm" disabled className="opacity-50">
        Não impersonável (admin)
      </Button>
    );
  }

  function handleSubmit() {
    if (reason.trim().length < 3) {
      toast.error("Motivo é obrigatório (mín. 3 caracteres).");
      return;
    }
    startTransition(async () => {
      const r = await impersonateUserAction({ user_id: userId, reason });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      // Abre o magic link em nova aba — preserva a sessão do admin na aba original.
      const newWindow = window.open(r.magic_link, "_blank", "noopener,noreferrer");
      if (newWindow) {
        toast.success(`Magic link gerado pra ${r.target_email} — abrindo em nova aba.`);
      } else {
        toast.info("Popup bloqueado. Use o link abaixo:", {
          action: { label: "Abrir", onClick: () => window.open(r.magic_link, "_blank") },
          duration: 30000,
        });
      }
      setOpen(false);
      setReason("");
    });
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="border-amber-700/40 text-amber-300 hover:bg-amber-950/30"
      >
        <UserCog className="mr-1 h-3.5 w-3.5" />
        Impersonate
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Impersonate {userEmail}</DialogTitle>
            <DialogDescription>
              Geramos um magic link com o e-mail desse usuário. Abre em nova aba — sua aba atual
              continua logada como admin. Toda a sessão impersonada é auditada.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-1.5">
            <Label htmlFor="reason">Motivo</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ex.: investigar bug reportado, verificar como o cliente vê o portal, etc."
              rows={3}
              maxLength={500}
            />
            <p className="text-xs text-zinc-500">
              Registrado no audit log com seu e-mail, IP e user-agent.
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={pending}>
              {pending ? "Gerando…" : "Gerar magic link"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
