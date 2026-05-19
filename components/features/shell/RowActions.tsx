"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

type ActionResult = { ok: true } | { ok: false; error: string };

type Props = {
  /** Label do item — ex: nome do projeto/cliente. Mostrado no dialog de confirmação. */
  itemName: string;
  /** Server action de exclusão. Recebe o id e retorna { ok }. */
  onDelete: () => Promise<ActionResult>;
  /** Texto curto descrevendo a entidade — ex: "projeto", "cliente". */
  entityLabel: string;
  /** Mensagem de aviso adicional no dialog (ex: cascata, irreversibilidade). */
  deleteWarning?: string;
  /** Mensagem de sucesso pro toast. */
  successMessage?: string;
  /** Se for projeto, redireciona após excluir; se cliente listado, só refresh. */
  redirectAfter?: string;
};

/**
 * Menu de 3 pontos (kebab) com ações: Abrir + Excluir.
 * Usado em linhas de tabela de projetos e clientes.
 */
export function RowActions({
  itemName,
  onDelete,
  entityLabel,
  deleteWarning,
  successMessage,
  redirectAfter,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      const result = await onDelete();
      if (result.ok) {
        toast.success(successMessage ?? `${entityLabel} excluído`);
        setOpen(false);
        if (redirectAfter) router.push(redirectAfter);
        else router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="ghost" size="sm" aria-label="Mais ações" className="h-8 w-8 p-0">
              <span aria-hidden>⋯</span>
            </Button>
          }
        />
        <DropdownMenuContent align="end" sideOffset={4}>
          <DropdownMenuItem
            onClick={() => setOpen(true)}
            className="text-red-600 focus:text-red-700 dark:text-red-400"
          >
            Excluir {entityLabel}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir {entityLabel}?</DialogTitle>
            <DialogDescription>
              Você está prestes a excluir <strong>{itemName}</strong>.
              {deleteWarning ? ` ${deleteWarning}` : ""} Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={pending}>
              {pending ? "Excluindo…" : "Excluir"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
