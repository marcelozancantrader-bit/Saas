"use client";

import { useState } from "react";
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
import { cancelPlanAction } from "@/server/actions/billing/cancel-plan.action";

type Props = {
  endsAt: string | null;
  planLabel: string;
};

export function CancelPlanButton({ endsAt, planLabel }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [pending, setPending] = useState(false);

  const endsAtPretty = endsAt
    ? new Date(endsAt).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      })
    : null;

  async function confirmCancel() {
    setPending(true);
    try {
      const r = await cancelPlanAction({ reason: reason.trim() || undefined });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      if (r.immediate) {
        toast.success("Plano cancelado. Workspace voltou pro Free.");
      } else if (r.ends_at) {
        const d = new Date(r.ends_at).toLocaleDateString("pt-BR");
        toast.success(`Cancelamento agendado. Acesso ${planLabel} até ${d}.`);
      } else {
        toast.success("Cancelamento agendado.");
      }
      setOpen(false);
      setReason("");
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="text-zinc-500 hover:text-red-600 dark:hover:text-red-400"
        onClick={() => setOpen(true)}
      >
        Cancelar plano
      </Button>

      <Dialog open={open} onOpenChange={(v) => !pending && setOpen(v)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancelar plano {planLabel}?</DialogTitle>
            <DialogDescription>
              {endsAtPretty
                ? `Você mantém acesso até ${endsAtPretty} (período já pago). Depois, o workspace volta pro Free automaticamente — projetos e documentos continuam salvos.`
                : `O workspace volta pro Free agora. Projetos e documentos continuam salvos, mas funcionalidades pagas (portal do cliente, sem marca d'água, branding) ficam indisponíveis.`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="cancel-reason">Motivo (opcional)</Label>
            <Textarea
              id="cancel-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="O que faltou? Algo que poderíamos melhorar?"
              rows={3}
              disabled={pending}
            />
            <p className="text-xs text-zinc-500">
              Seu feedback nos ajuda a melhorar o Memorial.ai. Não é obrigatório.
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
              Voltar
            </Button>
            <Button variant="destructive" onClick={confirmCancel} disabled={pending}>
              {pending ? "Cancelando…" : "Confirmar cancelamento"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
