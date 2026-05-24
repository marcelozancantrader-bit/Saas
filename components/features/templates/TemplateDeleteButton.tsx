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
import { Trash2 } from "lucide-react";
import { deleteTemplateAction } from "@/server/actions/templates/delete-template.action";

type Props = {
  templateId: string;
  templateName: string;
};

export function TemplateDeleteButton({ templateId, templateName }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function doDelete() {
    startTransition(async () => {
      const r = await deleteTemplateAction({ template_id: templateId });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success("Template removido");
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="shrink-0 text-zinc-500 hover:text-red-600 dark:hover:text-red-400"
        onClick={() => setOpen(true)}
        aria-label={`Remover template ${templateName}`}
      >
        <Trash2 className="h-4 w-4" />
      </Button>

      <Dialog open={open} onOpenChange={(v) => !pending && setOpen(v)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Remover template?</DialogTitle>
            <DialogDescription>
              O template &quot;{templateName}&quot; será removido permanentemente. Documentos já
              criados a partir dele continuam intactos — só não estará mais disponível pra novos
              projetos.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={doDelete} disabled={pending}>
              {pending ? "Removendo…" : "Remover template"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
