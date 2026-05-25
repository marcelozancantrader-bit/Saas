"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Eye, ThumbsUp, ThumbsDown, Send } from "lucide-react";
import { requestInternalReviewAction } from "@/server/actions/documents/request-internal-review.action";
import { decideInternalReviewAction } from "@/server/actions/documents/decide-internal-review.action";
import { useUpgradeGate } from "@/lib/billing/use-upgrade-gate";
import { UpgradeGateDialog } from "@/components/features/billing/UpgradeGateDialog";

export type ReviewMeta = {
  solicitada_por?: string;
  solicitada_em?: string;
  comentario_solicitacao?: string | null;
  decidida_por?: string | null;
  decidida_em?: string | null;
  decisao?: "aprovada" | "recusada" | null;
  comentario_revisao?: string | null;
};

type Props = {
  documentId: string;
  status: string;
  reviewMeta: ReviewMeta | null;
  userRole: "owner" | "admin" | "member";
  /** Indica se há mais de 1 membro na org. Se for 1, esconde o fluxo todo. */
  hasMultipleMembers: boolean;
};

export function InternalReviewPanel({
  documentId,
  status,
  reviewMeta,
  userRole,
  hasMultipleMembers,
}: Props) {
  const router = useRouter();
  const [requestDialogOpen, setRequestDialogOpen] = useState(false);
  const [decideDialogOpen, setDecideDialogOpen] = useState<"aprovada" | "recusada" | null>(null);
  const [comentario, setComentario] = useState("");
  const [pending, startTransition] = useTransition();
  const gate = useUpgradeGate();

  const canDecide = userRole === "owner" || userRole === "admin";
  const isAwaiting = status === "aguardando_revisao_interna";
  const lastDecision = reviewMeta?.decisao ?? null;

  // Se solo, esconde tudo (não tem com quem revisar)
  if (!hasMultipleMembers && !isAwaiting) return null;

  function doRequest() {
    startTransition(async () => {
      const r = await requestInternalReviewAction({
        document_id: documentId,
        comentario: comentario.trim() || undefined,
      });
      if (!gate.handle(r)) return;
      toast.success("Revisão interna solicitada. Owner/admin do workspace foi notificado.");
      setRequestDialogOpen(false);
      setComentario("");
      router.refresh();
    });
  }

  function doDecide(decisao: "aprovada" | "recusada") {
    startTransition(async () => {
      const r = await decideInternalReviewAction({
        document_id: documentId,
        decisao,
        comentario: comentario.trim() || undefined,
      });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success(
        decisao === "aprovada"
          ? "Revisão aprovada — documento liberado pra enviar ao cliente."
          : "Revisão recusada com comentário. Solicitante pode ajustar e pedir nova revisão.",
      );
      setDecideDialogOpen(null);
      setComentario("");
      router.refresh();
    });
  }

  const upgradeDialog = (
    <UpgradeGateDialog open={gate.open} onClose={gate.onClose} requirement={gate.requirement} />
  );

  // ESTADO: aguardando revisão — banner amber
  if (isAwaiting) {
    return (
      <>
        {upgradeDialog}
        <div className="rounded-lg border border-amber-300 bg-amber-50/60 p-4 dark:border-amber-900/40 dark:bg-amber-950/20">
          <div className="flex items-start gap-3">
            <Eye className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">
                Aguardando revisão interna
              </p>
              {reviewMeta?.comentario_solicitacao ? (
                <p className="mt-1 text-xs text-zinc-700 italic dark:text-zinc-300">
                  &quot;{reviewMeta.comentario_solicitacao}&quot;
                </p>
              ) : null}
              <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
                {canDecide
                  ? "Você pode aprovar (libera envio ao cliente) ou recusar com comentário."
                  : "Owner ou admin precisa aprovar antes de enviar ao cliente. Você será notificado quando decidirem."}
              </p>
              {canDecide ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    onClick={() => setDecideDialogOpen("aprovada")}
                    disabled={pending}
                    className="bg-emerald-600 hover:bg-emerald-700"
                  >
                    <ThumbsUp className="mr-1.5 h-3.5 w-3.5" />
                    Aprovar revisão
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setDecideDialogOpen("recusada")}
                    disabled={pending}
                    className="border-rose-300 text-rose-700 hover:bg-rose-50 dark:border-rose-900/40 dark:text-rose-400 dark:hover:bg-rose-950/20"
                  >
                    <ThumbsDown className="mr-1.5 h-3.5 w-3.5" />
                    Pedir ajustes
                  </Button>
                </div>
              ) : null}
            </div>
          </div>

          <DecideDialog
            open={decideDialogOpen}
            onClose={() => setDecideDialogOpen(null)}
            onConfirm={(d) => doDecide(d)}
            pending={pending}
            comentario={comentario}
            setComentario={setComentario}
          />
        </div>
      </>
    );
  }

  // ESTADO: rascunho com decisão recente (mostra histórico curto)
  if (status === "rascunho" && lastDecision) {
    const tone =
      lastDecision === "aprovada"
        ? "border-emerald-300 bg-emerald-50/40 dark:border-emerald-900/40 dark:bg-emerald-950/20"
        : "border-rose-300 bg-rose-50/40 dark:border-rose-900/40 dark:bg-rose-950/20";
    const textTone =
      lastDecision === "aprovada"
        ? "text-emerald-900 dark:text-emerald-100"
        : "text-rose-900 dark:text-rose-100";
    return (
      <>
        {upgradeDialog}
        <div className={`rounded-lg border p-3 text-sm ${tone}`}>
          <p className={`font-medium ${textTone}`}>
            {lastDecision === "aprovada"
              ? "✓ Revisão interna aprovada — pode enviar ao cliente"
              : "✗ Revisão recusada — ajuste e solicite nova revisão"}
          </p>
          {reviewMeta?.comentario_revisao ? (
            <p className="mt-1 text-xs text-zinc-700 italic dark:text-zinc-300">
              &quot;{reviewMeta.comentario_revisao}&quot;
            </p>
          ) : null}
          {reviewMeta?.decidida_em ? (
            <p className="mt-1 text-[11px] text-zinc-500">
              decidido em {new Date(reviewMeta.decidida_em).toLocaleString("pt-BR")}
            </p>
          ) : null}
          {hasMultipleMembers && lastDecision === "recusada" ? (
            <Button
              size="sm"
              variant="outline"
              className="mt-2"
              onClick={() => setRequestDialogOpen(true)}
              disabled={pending}
            >
              <Send className="mr-1.5 h-3.5 w-3.5" />
              Solicitar nova revisão
            </Button>
          ) : null}

          <RequestDialog
            open={requestDialogOpen}
            onClose={() => setRequestDialogOpen(false)}
            onConfirm={doRequest}
            pending={pending}
            comentario={comentario}
            setComentario={setComentario}
          />
        </div>
      </>
    );
  }

  // ESTADO: rascunho sem revisão anterior — botão pra solicitar
  if (status === "rascunho") {
    return (
      <>
        {upgradeDialog}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setRequestDialogOpen(true)}
          disabled={pending}
        >
          <Eye className="mr-1.5 h-3.5 w-3.5" />
          Solicitar revisão interna
        </Button>

        <RequestDialog
          open={requestDialogOpen}
          onClose={() => setRequestDialogOpen(false)}
          onConfirm={doRequest}
          pending={pending}
          comentario={comentario}
          setComentario={setComentario}
        />
      </>
    );
  }

  return null;
}

function RequestDialog({
  open,
  onClose,
  onConfirm,
  pending,
  comentario,
  setComentario,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  pending: boolean;
  comentario: string;
  setComentario: (v: string) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(v) => !pending && !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Solicitar revisão interna</DialogTitle>
          <DialogDescription>
            Owner ou admin do workspace vai revisar o documento antes de enviar ao cliente.
            Comentário opcional pra direcionar a revisão.
          </DialogDescription>
        </DialogHeader>
        <Textarea
          value={comentario}
          onChange={(e) => setComentario(e.target.value)}
          placeholder="Ex: revisar especificação da fachada e cláusula de aditivo"
          rows={3}
          maxLength={500}
          disabled={pending}
        />
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={pending}>
            Cancelar
          </Button>
          <Button onClick={onConfirm} disabled={pending}>
            {pending ? "Enviando…" : "Solicitar revisão"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DecideDialog({
  open,
  onClose,
  onConfirm,
  pending,
  comentario,
  setComentario,
}: {
  open: "aprovada" | "recusada" | null;
  onClose: () => void;
  onConfirm: (d: "aprovada" | "recusada") => void;
  pending: boolean;
  comentario: string;
  setComentario: (v: string) => void;
}) {
  const isReject = open === "recusada";
  return (
    <Dialog open={!!open} onOpenChange={(v) => !pending && !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isReject ? "Recusar revisão" : "Aprovar revisão"}</DialogTitle>
          <DialogDescription>
            {isReject
              ? "Explique o que precisa ajustar. O solicitante vai ver seu comentário e poderá pedir nova revisão depois."
              : "Documento volta pra rascunho liberado e pode ser enviado ao cliente. Comentário opcional."}
          </DialogDescription>
        </DialogHeader>
        <Textarea
          value={comentario}
          onChange={(e) => setComentario(e.target.value)}
          placeholder={
            isReject
              ? "Ex: o item de impermeabilização está faltando na seção 4"
              : "Tudo certo — pode enviar."
          }
          rows={3}
          maxLength={500}
          disabled={pending}
        />
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={pending}>
            Cancelar
          </Button>
          <Button
            onClick={() => open && onConfirm(open)}
            disabled={pending}
            className={isReject ? undefined : "bg-emerald-600 hover:bg-emerald-700"}
            variant={isReject ? "destructive" : "default"}
          >
            {pending ? "Salvando…" : isReject ? "Recusar" : "Aprovar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
