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
import { Bookmark, FileText } from "lucide-react";
import { applyTemplateAction } from "@/server/actions/templates/use-template.action";
import { DOCUMENT_LABELS, type DocumentTipo } from "@/lib/ai/generate-document";

export type OrgTemplate = {
  id: string;
  tipo: string;
  nome: string;
  created_at: string;
};

type Props = {
  projectId: string;
  templates: OrgTemplate[];
  trigger?: React.ReactNode;
};

function tipoLabel(tipo: string): string {
  if (tipo in DOCUMENT_LABELS) return DOCUMENT_LABELS[tipo as DocumentTipo];
  return tipo;
}

export function UseTemplateDialog({ projectId, templates, trigger }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [usingId, setUsingId] = useState<string | null>(null);

  function doUse(templateId: string) {
    setUsingId(templateId);
    startTransition(async () => {
      const r = await applyTemplateAction({
        template_id: templateId,
        project_id: projectId,
      });
      setUsingId(null);
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success("Documento criado a partir do template");
      router.push(`/projetos/${projectId}/documentos/${r.document_id}`);
      setOpen(false);
    });
  }

  return (
    <>
      <span onClick={() => setOpen(true)}>
        {trigger ?? (
          <Button variant="outline" size="sm">
            <Bookmark className="mr-1.5 h-3.5 w-3.5" />
            Usar template salvo
          </Button>
        )}
      </span>

      <Dialog open={open} onOpenChange={(v) => !pending && setOpen(v)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Usar template do escritório</DialogTitle>
            <DialogDescription>
              Cria um novo documento neste projeto a partir de um template salvo previamente. As
              variáveis ({"{{projeto.nome}}, {{cliente.nome}}"}, etc) são substituídas
              automaticamente.
            </DialogDescription>
          </DialogHeader>

          {templates.length === 0 ? (
            <div className="rounded-md border border-dashed border-zinc-300 p-6 text-center text-sm dark:border-zinc-700">
              <FileText className="mx-auto h-8 w-8 text-zinc-400" />
              <p className="mt-2 font-medium text-zinc-700 dark:text-zinc-300">
                Nenhum template salvo ainda
              </p>
              <p className="mt-1 text-xs text-zinc-500">
                Gere um documento por IA, edite como ficar bom, e clique em &quot;Salvar como
                template&quot; no editor pra reutilizar em projetos futuros.
              </p>
            </div>
          ) : (
            <div className="max-h-80 space-y-1 overflow-y-auto rounded-md border p-1">
              {templates.map((t) => {
                const isUsing = usingId === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => doUse(t.id)}
                    disabled={pending}
                    className={`block w-full rounded-md px-3 py-2 text-left transition ${
                      isUsing
                        ? "animate-pulse bg-blue-50 dark:bg-blue-950/40"
                        : "hover:bg-blue-50 dark:hover:bg-blue-950/40"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold">{t.nome}</p>
                      <span className="shrink-0 text-[10px] text-zinc-500">
                        {tipoLabel(t.tipo)}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[11px] text-zinc-500">
                      criado em {new Date(t.created_at).toLocaleDateString("pt-BR")}
                      {isUsing ? " · criando documento…" : ""}
                    </p>
                  </button>
                );
              })}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
