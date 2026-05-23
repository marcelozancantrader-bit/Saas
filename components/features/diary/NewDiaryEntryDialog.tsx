"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Camera, X, Plus } from "lucide-react";
import { createDiaryEntryAction } from "@/server/actions/diary/create-entry.action";

type Props = {
  projectId: string;
};

const MAX_PHOTOS = 6;

export function NewDiaryEntryDialog({ projectId }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [files, setFiles] = useState<File[]>([]);

  function handleFilesChange(e: React.ChangeEvent<HTMLInputElement>) {
    const list = Array.from(e.target.files ?? []);
    if (list.length === 0) return;
    setFiles((prev) => {
      const merged = [...prev, ...list].slice(0, MAX_PHOTOS);
      if (prev.length + list.length > MAX_PHOTOS) {
        toast.warning(`Limite de ${MAX_PHOTOS} fotos por entrada — algumas foram ignoradas.`);
      }
      return merged;
    });
    // Reset input pra permitir re-selecionar mesmo arquivo se necessário.
    e.target.value = "";
  }

  function removeFile(idx: number) {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const fd = new FormData(form);
    fd.set("project_id", projectId);
    // Substitui o input file (que pode não estar sincronizado) pelos files do state.
    fd.delete("photos");
    for (const f of files) fd.append("photos", f);

    startTransition(async () => {
      const r = await createDiaryEntryAction(fd);
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success("Entrada do diário registrada");
      setFiles([]);
      setOpen(false);
      form.reset();
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !pending && setOpen(v)}>
      <Button onClick={() => setOpen(true)} size="sm">
        <Plus className="mr-1.5 h-3.5 w-3.5" />
        Nova entrada
      </Button>

      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            Registrar entrada no diário de obra
          </DialogTitle>
          <DialogDescription>
            Fotos + nota viram prova legal de estado da obra naquele momento. Útil pra justificar
            aditivos e mostrar progresso ao cliente.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="titulo">Título *</Label>
            <Input
              id="titulo"
              name="titulo"
              required
              maxLength={160}
              placeholder="Ex: Conclusão das fundações"
              disabled={pending}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="registrado_em">Data do registro</Label>
              <Input
                id="registrado_em"
                name="registrado_em"
                type="datetime-local"
                disabled={pending}
                defaultValue={defaultDateTimeLocal()}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="local_label">Local (opcional)</Label>
              <Input
                id="local_label"
                name="local_label"
                maxLength={160}
                placeholder="Ex: Fachada frente, 1º pavimento"
                disabled={pending}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="body">Notas (opcional)</Label>
            <Textarea
              id="body"
              name="body"
              rows={3}
              maxLength={4000}
              placeholder="Detalhes do que aconteceu, problemas observados, decisões tomadas em campo…"
              disabled={pending}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Fotos (até {MAX_PHOTOS}, máx 8 MB cada)</Label>
            <div className="flex flex-wrap items-start gap-2">
              {files.map((file, idx) => (
                <div
                  key={`${file.name}-${idx}`}
                  className="relative h-20 w-20 overflow-hidden rounded-md border border-zinc-300 bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={URL.createObjectURL(file)}
                    alt={file.name}
                    className="h-full w-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removeFile(idx)}
                    disabled={pending}
                    className="absolute top-0.5 right-0.5 rounded-full bg-zinc-900/80 p-0.5 text-white hover:bg-zinc-900"
                    aria-label={`Remover ${file.name}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              {files.length < MAX_PHOTOS ? (
                <label className="flex h-20 w-20 cursor-pointer flex-col items-center justify-center gap-1 rounded-md border-2 border-dashed border-zinc-300 text-zinc-500 transition hover:border-blue-400 hover:text-blue-600 dark:border-zinc-700 dark:hover:border-blue-500 dark:hover:text-blue-400">
                  <Camera className="h-5 w-5" />
                  <span className="text-[10px]">Adicionar</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
                    capture="environment"
                    multiple
                    className="hidden"
                    onChange={handleFilesChange}
                    disabled={pending}
                  />
                </label>
              ) : null}
            </div>
            <p className="text-xs text-zinc-500">
              No celular, abre direto a câmera. Você também pode escolher do rolo.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="tags">Tags (opcional, separadas por vírgula)</Label>
            <Input
              id="tags"
              name="tags"
              maxLength={400}
              placeholder="Ex: fundação, antes-aditivo, problema"
              disabled={pending}
            />
          </div>

          <label className="flex cursor-pointer items-start gap-2 rounded-md border border-zinc-200 bg-zinc-50 p-3 text-sm dark:border-zinc-800 dark:bg-zinc-900">
            <input
              type="checkbox"
              name="portal_visible"
              value="on"
              disabled={pending}
              className="mt-0.5 h-4 w-4 cursor-pointer"
            />
            <span>
              <span className="font-medium">Mostrar essa entrada no portal do cliente</span>
              <span className="mt-0.5 block text-xs text-zinc-500">
                Cliente verá a foto e a nota quando abrir o link do portal. Você pode mudar depois.
              </span>
            </span>
          </label>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => !pending && setOpen(false)}
              disabled={pending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Salvando…" : "Salvar entrada"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function defaultDateTimeLocal(): string {
  const d = new Date();
  d.setSeconds(0, 0);
  // formato YYYY-MM-DDTHH:MM
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
