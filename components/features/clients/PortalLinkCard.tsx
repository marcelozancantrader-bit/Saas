"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

type Props = {
  /** URL pública completa do portal (com origem). */
  portalUrl: string;
  /** Se true, mostra um alerta avisando que o plano atual não habilita o portal. */
  portalDisabled?: boolean;
};

/**
 * Card destacado com o link público do portal do cliente.
 * O profissional pode copiar pra mandar por WhatsApp/e-mail/SMS.
 */
export function PortalLinkCard({ portalUrl, portalDisabled = false }: Props) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(portalUrl);
      setCopied(true);
      toast.success("Link copiado!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Não consegui copiar — copie manualmente.");
    }
  }

  return (
    <Card className="border-blue-200 bg-blue-50/40 dark:border-blue-900/40 dark:bg-blue-950/20">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">🔗 Portal do cliente</CardTitle>
          {portalDisabled ? (
            <Badge variant="outline">Indisponível no Free</Badge>
          ) : (
            <Badge variant="default">Ativo</Badge>
          )}
        </div>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Link único que o cliente abre pra acompanhar projetos, aprovar documentos com assinatura
          digital e solicitar alterações de escopo. Não precisa de senha.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            value={portalUrl}
            readOnly
            className="font-mono text-xs"
            onClick={(e) => (e.target as HTMLInputElement).select()}
          />
          <Button
            type="button"
            variant={copied ? "outline" : "default"}
            onClick={copy}
            disabled={portalDisabled}
            className="shrink-0"
          >
            {copied ? "✓ Copiado" : "Copiar link"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => window.open(portalUrl, "_blank", "noopener,noreferrer")}
            disabled={portalDisabled}
            className="shrink-0"
          >
            Abrir →
          </Button>
        </div>
        {portalDisabled ? (
          <p className="text-xs text-amber-700 dark:text-amber-400">
            O plano Free não habilita o portal do cliente. Faça upgrade pro Standard ou superior
            para liberar.
          </p>
        ) : (
          <p className="text-xs text-zinc-500">
            Sugestão: copie e mande pelo WhatsApp ou e-mail. O cliente abre direto no celular.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
