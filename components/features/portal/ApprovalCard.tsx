"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { SignatureCanvas } from "./SignatureCanvas";
import { approveDocumentAction } from "@/server/actions/portal/approve-document.action";
import type { PortalDocument } from "@/server/services/portal-loader";

type Props = {
  portalToken: string;
  projectId: string;
  document: PortalDocument;
  tipoLabel: string;
};

export function ApprovalCard({ portalToken, projectId, document, tipoLabel }: Props) {
  const [signature, setSignature] = useState<string | null>(null);
  const [obs, setObs] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showRejectBox, setShowRejectBox] = useState(false);
  const [accepted, setAccepted] = useState(false);

  async function submit(decisao: "aprovado" | "recusado") {
    if (!signature) {
      toast.error("Desenhe sua assinatura antes de continuar.");
      return;
    }
    if (decisao === "aprovado" && !accepted) {
      toast.error("Marque o aceite dos termos antes de aprovar.");
      return;
    }
    setSubmitting(true);
    try {
      const r = await approveDocumentAction({
        token: portalToken,
        project_id: projectId,
        document_id: document.id,
        decisao,
        assinatura_data_url: signature,
        observacoes: obs.trim() || undefined,
      });
      if (!r.ok) {
        toast.error(r.error);
      } else {
        toast.success(decisao === "aprovado" ? "Documento aprovado." : "Documento recusado.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  const enviadoEm = document.envio_meta?.enviado_em
    ? new Date(document.envio_meta.enviado_em).toLocaleString("pt-BR")
    : null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base">{document.titulo}</CardTitle>
            <p className="mt-1 text-xs text-zinc-500">
              {tipoLabel} · v{document.versao}
              {enviadoEm ? ` · enviado em ${enviadoEm}` : null}
            </p>
          </div>
          <Badge variant="secondary">Aguardando você</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <p className="text-zinc-700 dark:text-zinc-300">
          Leia o documento antes de aprovar. Sua decisão é registrada com data, hora e identificador
          único — tem o mesmo valor de uma assinatura no papel.
        </p>

        <div className="space-y-2">
          <label className="text-xs font-medium tracking-wider text-zinc-500 uppercase">
            Sua assinatura
          </label>
          <SignatureCanvas onChange={setSignature} required />
        </div>

        <label className="flex items-start gap-2 text-xs text-zinc-700 dark:text-zinc-300">
          <input
            type="checkbox"
            className="mt-0.5"
            checked={accepted}
            onChange={(e) => setAccepted(e.target.checked)}
          />
          <span>Declaro que li e concordo com o documento. (Validade legal — MP 2.200-2/2001)</span>
        </label>

        {showRejectBox ? (
          <div className="space-y-2">
            <label className="text-xs font-medium tracking-wider text-zinc-500 uppercase">
              Motivo da recusa (opcional, mas ajuda o profissional a ajustar)
            </label>
            <Textarea
              value={obs}
              onChange={(e) => setObs(e.target.value)}
              rows={3}
              maxLength={2000}
              placeholder="Ex: o prazo está muito apertado, prefiro material X ao invés de Y, etc."
            />
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-2 pt-2">
          <Button onClick={() => submit("aprovado")} disabled={submitting || !signature}>
            {submitting ? "Enviando…" : "Aprovar documento"}
          </Button>
          {showRejectBox ? (
            <Button
              variant="destructive"
              onClick={() => submit("recusado")}
              disabled={submitting || !signature}
            >
              {submitting ? "Enviando…" : "Confirmar recusa"}
            </Button>
          ) : (
            <Button variant="outline" onClick={() => setShowRejectBox(true)} disabled={submitting}>
              Recusar
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
