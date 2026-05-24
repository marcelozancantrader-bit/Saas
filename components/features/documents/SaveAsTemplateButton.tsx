"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Bookmark } from "lucide-react";
import { saveDocumentAsTemplateAction } from "@/server/actions/templates/save-template.action";

type Props = {
  documentId: string;
  defaultName: string;
};

export function SaveAsTemplateButton({ documentId, defaultName }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [nome, setNome] = useState(defaultName);
  const [pending, startTransition] = useTransition();

  function doSave() {
    if (nome.trim().length < 3) {
      toast.error("Nome do template precisa ter pelo menos 3 caracteres");
      return;
    }
    startTransition(async () => {
      const r = await saveDocumentAsTemplateAction({
        source_document_id: documentId,
        nome: nome.trim(),
      });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success(`Template "${nome}" salvo no escritório`);
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Bookmark className="mr-1.5 h-3.5 w-3.5" />
        Salvar como template
      </Button>

      <Dialog open={open} onOpenChange={(v) => !pending && setOpen(v)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Salvar como template do escritório</DialogTitle>
            <DialogDescription>
              O conteúdo atual deste documento vira um template reutilizável em qualquer projeto
              futuro do seu workspace. Você pode editar antes de salvar dados estáticos como
              cabeçalho, cláusulas padrão, especificações recorrentes.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="template-nome">Nome do template *</Label>
              <Input
                id="template-nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex: Memorial residencial PF padrão"
                maxLength={120}
              />
            </div>

            <div className="rounded-md border border-blue-200 bg-blue-50/50 p-3 text-xs dark:border-blue-900/40 dark:bg-blue-950/20">
              <p className="font-semibold text-blue-900 dark:text-blue-100">
                Dica: use variáveis substituíveis
              </p>
              <p className="mt-1 text-zinc-700 dark:text-zinc-300">
                Você pode incluir <code className="text-[10px]">{"{{projeto.nome}}"}</code>,{" "}
                <code className="text-[10px]">{"{{cliente.nome}}"}</code>,{" "}
                <code className="text-[10px]">{"{{org.nome}}"}</code>,{" "}
                <code className="text-[10px]">{"{{org.profissional}}"}</code>,{" "}
                <code className="text-[10px]">{"{{data.hoje}}"}</code>. Ao usar o template num novo
                projeto, são substituídas automaticamente.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
              Cancelar
            </Button>
            <Button onClick={doSave} disabled={pending}>
              {pending ? "Salvando…" : "Salvar template"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
