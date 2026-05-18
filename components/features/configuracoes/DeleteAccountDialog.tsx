"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { deleteAccountAction } from "@/server/actions/lgpd/delete-account.action";

const CONFIRM_PHRASE = "DELETAR MINHA CONTA";

export function DeleteAccountDialog() {
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [pending, setPending] = useState(false);

  async function submit() {
    setPending(true);
    try {
      // Action does redirect on success; on error returns object.
      const r = await deleteAccountAction({ confirm_text: confirm });
      // If we reach here, action returned an error (success would have redirected).
      if (r && !r.ok) toast.error(r.error);
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="destructive" size="sm" />}>
        Excluir conta…
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Excluir conta e dados</DialogTitle>
          <DialogDescription>
            Esta ação é <strong>irreversível</strong>. Todos os clientes, projetos, documentos,
            orçamentos e histórico de auditoria das organizações onde você é owner serão removidos
            imediatamente.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 text-sm">
          <p>
            Para confirmar, digite exatamente:{" "}
            <code className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-xs dark:bg-zinc-800">
              {CONFIRM_PHRASE}
            </code>
          </p>
          <Input
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder={CONFIRM_PHRASE}
            autoComplete="off"
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={submit}
            disabled={pending || confirm !== CONFIRM_PHRASE}
          >
            {pending ? "Excluindo…" : "Excluir definitivamente"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
