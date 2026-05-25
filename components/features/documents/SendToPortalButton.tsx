"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { sendDocumentToPortalAction } from "@/server/actions/documents/send-to-portal.action";
import { useUpgradeGate } from "@/lib/billing/use-upgrade-gate";
import { UpgradeGateDialog } from "@/components/features/billing/UpgradeGateDialog";

type Props = {
  documentId: string;
  envioMeta: { enviado_em: string } | null;
  projectId: string;
  hasClient: boolean;
};

export function SendToPortalButton({ documentId, envioMeta, projectId, hasClient }: Props) {
  const [sending, setSending] = useState(false);
  const [link, setLink] = useState<string | null>(null);
  const alreadySent = !!envioMeta;
  const gate = useUpgradeGate();

  async function send() {
    setSending(true);
    try {
      const r = await sendDocumentToPortalAction({ document_id: documentId });
      if (!gate.handle(r)) return;
      const url = `${window.location.origin}/portal/${r.portal_token}`;
      setLink(url);
      await navigator.clipboard.writeText(url).catch(() => {});
      const channels: string[] = [];
      if (r.email_sent) channels.push("e-mail");
      if (r.whatsapp_sent) channels.push("WhatsApp");
      const channelMsg =
        channels.length > 0
          ? `Cliente notificado por ${channels.join(" + ")}.`
          : "Envio automático desativado — compartilhe o link manualmente.";
      toast.success(`${channelMsg} Link copiado para o clipboard.`);
    } finally {
      setSending(false);
    }
  }

  const upgradeDialog = (
    <UpgradeGateDialog open={gate.open} onClose={gate.onClose} requirement={gate.requirement} />
  );

  if (!hasClient) {
    return (
      <div className="flex flex-col items-end gap-1">
        <Button
          size="sm"
          disabled
          title="Vincule um cliente ao projeto antes de enviar"
          aria-label="Enviar ao cliente — desabilitado, projeto sem cliente"
        >
          Enviar ao cliente
        </Button>
        <Link
          href={`/projetos/${projectId}?tab=visao`}
          className="text-[10px] text-blue-600 underline-offset-2 hover:underline dark:text-blue-400"
        >
          Vincular cliente ao projeto
        </Link>
      </div>
    );
  }

  if (alreadySent && !link) {
    const enviadoEm = new Date(envioMeta!.enviado_em).toLocaleString("pt-BR");
    return (
      <>
        {upgradeDialog}
        <Button variant="outline" size="sm" onClick={send} disabled={sending}>
          {sending ? "Reenviando…" : `Reenviar ao cliente (último: ${enviadoEm})`}
        </Button>
      </>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      {upgradeDialog}
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
