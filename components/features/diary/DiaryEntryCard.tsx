"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Trash2, MapPin, Eye, EyeOff, Calendar } from "lucide-react";
import { deleteDiaryEntryAction } from "@/server/actions/diary/delete-entry.action";
import { toggleDiaryPortalVisibleAction } from "@/server/actions/diary/toggle-portal-visible.action";
import type { DiaryEntryWithUrls } from "@/server/services/diary";

type Props = {
  entry: DiaryEntryWithUrls;
};

export function DiaryEntryCard({ entry }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirmRemove, setConfirmRemove] = useState(false);

  const dataFormatada = new Date(entry.registrado_em).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  function togglePortal() {
    startTransition(async () => {
      const r = await toggleDiaryPortalVisibleAction({
        entry_id: entry.id,
        visible: !entry.portal_visible,
      });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success(
        entry.portal_visible
          ? "Entrada escondida do portal"
          : "Entrada visível no portal do cliente",
      );
      router.refresh();
    });
  }

  function doRemove() {
    startTransition(async () => {
      const r = await deleteDiaryEntryAction({ entry_id: entry.id });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success("Entrada removida");
      setConfirmRemove(false);
      router.refresh();
    });
  }

  return (
    <Card className="overflow-hidden">
      <CardContent className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-semibold tracking-tight">{entry.titulo}</h3>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-500">
              <span className="inline-flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {dataFormatada}
              </span>
              {entry.local_label ? (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {entry.local_label}
                </span>
              ) : null}
              {entry.portal_visible ? (
                <Badge className="border-blue-200 bg-blue-50 text-[10px] text-blue-700 dark:border-blue-900/40 dark:bg-blue-950/40 dark:text-blue-300">
                  Visível no portal
                </Badge>
              ) : null}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={togglePortal}
              disabled={pending}
              title={
                entry.portal_visible
                  ? "Esconder do portal do cliente"
                  : "Mostrar no portal do cliente"
              }
              aria-label={
                entry.portal_visible
                  ? "Esconder do portal do cliente"
                  : "Mostrar no portal do cliente"
              }
            >
              {entry.portal_visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setConfirmRemove(true)}
              disabled={pending}
              className="text-zinc-500 hover:text-red-600 dark:hover:text-red-400"
              title="Remover entrada"
              aria-label="Remover entrada"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {entry.body ? (
          <p className="text-sm whitespace-pre-wrap text-zinc-700 dark:text-zinc-300">
            {entry.body}
          </p>
        ) : null}

        {entry.photo_urls.length > 0 ? (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {entry.photo_urls.map((url, i) =>
              url ? (
                <a
                  key={i}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block aspect-square overflow-hidden rounded-md border border-zinc-200 dark:border-zinc-800"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt={`Foto ${i + 1} — ${entry.titulo}`}
                    className="h-full w-full object-cover transition hover:scale-105"
                    loading="lazy"
                  />
                </a>
              ) : null,
            )}
          </div>
        ) : null}

        {entry.tags.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {entry.tags.map((t) => (
              <Badge key={t} variant="outline" className="text-[10px]">
                #{t}
              </Badge>
            ))}
          </div>
        ) : null}
      </CardContent>

      <Dialog open={confirmRemove} onOpenChange={(v) => !pending && setConfirmRemove(v)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Remover entrada do diário?</DialogTitle>
            <DialogDescription>
              A entrada &quot;{entry.titulo}&quot; e suas {entry.photo_urls.length}{" "}
              {entry.photo_urls.length === 1 ? "foto" : "fotos"} serão removidas permanentemente.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmRemove(false)} disabled={pending}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={doRemove} disabled={pending}>
              {pending ? "Removendo…" : "Remover"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
