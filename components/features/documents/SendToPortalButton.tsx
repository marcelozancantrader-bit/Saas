"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { sendDocumentToPortalAction } from "@/server/actions/documents/send-to-portal.action";

type Props = {
  documentId: string;
  envioMeta: { enviado_em: string } | null;
};

export function SendToPortalButton({ documentId, envioMeta }: Props) {
  const [sending, setSending] = useState(false);
  const [link, setLink] = useState<string | null>(null);
  const alreadySent = !!envioMeta;

  async function send() {
    setSending(true);
    try {
      const r = await sendDocumentToPortalAction({ document_id: documentId });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      const url = `${window.location.origin}/portal/${r.portal_token}`;
      setLink(url);
      await navigator.clipboard.writeText(url).catch(() => {});
      toast.success(
        r.email_sent
          ? "Cliente notificado por e-mail. Link copiado para o clipboard."
          : "Link copiado para o clipboard (envio por e-mail desativado).",
      );
    } finally {
      setSending(false);
    }
  }

  if (alreadySent && !link) {
    const enviadoEm = new Date(envioMeta!.enviado_em).toLocaleString("pt-BR");
    return (
      <Button variant="outline" size="sm" onClick={send} disabled={sending}>
        {sending ? "Reenviando…" : `Reenviar ao cliente (último: ${enviadoEm})`}
      </Button>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button onClick={send} disabled={sending} size="sm">
        {sending ? "Enviando…" : "Enviar ao cliente"}
      </Button>
      {link ? (
        <a
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[10px] text-zinc-500 underline-offset-2 hover:underline"
        >
          {link}
        </a>
      ) : null}
    </div>
  );
}
