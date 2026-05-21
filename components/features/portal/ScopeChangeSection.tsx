"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SignatureCanvas } from "./SignatureCanvas";
import { requestScopeChangeAction } from "@/server/actions/portal/request-scope-change.action";
import { approveScopeChangeAction } from "@/server/actions/portal/approve-scope-change.action";
import type { PortalScopeChange } from "@/server/services/portal-loader";

type Props = {
  portalToken: string;
  projectId: string;
  scopeChanges: PortalScopeChange[];
};

const STATUS_LABEL: Record<PortalScopeChange["status"], string> = {
  pendente_analise: "Em análise pelo profissional",
  aguardando_cliente: "Aguardando sua aprovação",
  aprovado: "Aprovado",
  recusado: "Recusado",
  cancelado: "Cancelado",
};

const STATUS_VARIANT: Record<
  PortalScopeChange["status"],
  "default" | "outline" | "secondary" | "destructive"
> = {
  pendente_analise: "secondary",
  aguardando_cliente: "secondary",
  aprovado: "default",
  recusado: "destructive",
  cancelado: "outline",
};

function brl(value: number | null): string {
  if (value === null) return "—";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

export function ScopeChangeSection({ portalToken, projectId, scopeChanges }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [descricao, setDescricao] = useState("");
  const [urgencia, setUrgencia] = useState<"baixa" | "media" | "alta">("media");
  const [submitting, setSubmitting] = useState(false);

  async function submitRequest() {
    if (descricao.trim().length < 10) {
      toast.error("Descreva a alteração com pelo menos 10 caracteres.");
      return;
    }
    setSubmitting(true);
    try {
      const r = await requestScopeChangeAction({
        token: portalToken,
        project_id: projectId,
        descricao: descricao.trim(),
        urgencia,
      });
      if (!r.ok) toast.error(r.error);
      else {
        toast.success("Solicitação enviada ao profissional.");
        setDescricao("");
        setUrgencia("media");
        setShowForm(false);
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Alterações de escopo</h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Quer acrescentar uma sacada, mudar o piso, refazer o elétrico? Peça aqui. Seu
            profissional avalia, define um valor extra (chamado <em>aditivo</em>) e você aprova com
            assinatura — tudo registrado.
          </p>
        </div>
        <Button onClick={() => setShowForm((s) => !s)} variant={showForm ? "outline" : "default"}>
          {showForm ? "Cancelar" : "Solicitar alteração"}
        </Button>
      </div>

      {showForm ? (
        <Card>
          <CardContent className="space-y-3 p-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium tracking-wider text-zinc-500 uppercase">
                Descreva a alteração
              </label>
              <Textarea
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                rows={4}
                maxLength={4000}
                placeholder="Ex: gostaria de incluir uma sacada no quarto 1, ~3m², piso em deck de madeira, guarda-corpo em vidro."
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium tracking-wider text-zinc-500 uppercase">
                Urgência
              </label>
              <Select value={urgencia} onValueChange={(v) => setUrgencia(v as typeof urgencia)}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="baixa">Baixa — sem pressa</SelectItem>
                  <SelectItem value="media">Média — nas próximas semanas</SelectItem>
                  <SelectItem value="alta">Alta — afeta o cronograma agora</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={submitRequest} disabled={submitting}>
              {submitting ? "Enviando…" : "Enviar solicitação"}
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {scopeChanges.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-sm text-zinc-500">
            Nenhuma alteração registrada ainda.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {scopeChanges.map((sc) => (
            <ScopeChangeItem key={sc.id} sc={sc} portalToken={portalToken} projectId={projectId} />
          ))}
        </div>
      )}
    </section>
  );
}

function ScopeChangeItem({
  sc,
  portalToken,
  projectId,
}: {
  sc: PortalScopeChange;
  portalToken: string;
  projectId: string;
}) {
  const [signature, setSignature] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function decide(decisao: "aprovado" | "recusado") {
    if (!signature) {
      toast.error("Desenhe sua assinatura antes de continuar.");
      return;
    }
    setSubmitting(true);
    try {
      const r = await approveScopeChangeAction({
        token: portalToken,
        project_id: projectId,
        scope_change_id: sc.id,
        decisao,
        assinatura_data_url: signature,
      });
      if (!r.ok) toast.error(r.error);
      else
        toast.success(
          decisao === "aprovado"
            ? "Alteração aprovada e formalizada como aditivo."
            : "Alteração recusada.",
        );
    } finally {
      setSubmitting(false);
    }
  }

  const showApproval = sc.status === "aguardando_cliente";

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-sm font-medium">
              {sc.solicitado_por === "cliente" ? "Solicitação sua" : "Proposta do profissional"}
            </CardTitle>
            <p className="mt-1 text-xs text-zinc-500">
              {new Date(sc.created_at).toLocaleString("pt-BR")}
              {sc.urgencia ? ` · urgência ${sc.urgencia}` : null}
            </p>
          </div>
          <Badge variant={STATUS_VARIANT[sc.status]}>{STATUS_LABEL[sc.status]}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <p className="whitespace-pre-wrap text-zinc-700 dark:text-zinc-300">{sc.descricao}</p>

        {sc.status !== "pendente_analise" &&
        (sc.valor_aditivo !== null || sc.prazo_adicional_dias !== null) ? (
          <div className="grid grid-cols-2 gap-3 rounded border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900">
            <div>
              <p className="text-xs tracking-wider text-zinc-500 uppercase">Aditivo</p>
              <p className="font-medium">{brl(sc.valor_aditivo)}</p>
            </div>
            <div>
              <p className="text-xs tracking-wider text-zinc-500 uppercase">Prazo extra</p>
              <p className="font-medium">
                {sc.prazo_adicional_dias !== null ? `${sc.prazo_adicional_dias} dias` : "—"}
              </p>
            </div>
          </div>
        ) : null}

        {showApproval ? (
          <div className="space-y-3 border-t border-zinc-200 pt-3 dark:border-zinc-800">
            <p className="text-xs text-zinc-600 dark:text-zinc-400">
              Assine abaixo para aprovar este aditivo, ou clique em Recusar.
            </p>
            <SignatureCanvas onChange={setSignature} height={120} />
            <div className="flex flex-wrap items-center gap-2">
              <Button onClick={() => decide("aprovado")} disabled={submitting || !signature}>
                {submitting ? "…" : "Aprovar aditivo"}
              </Button>
              <Button
                variant="outline"
                onClick={() => decide("recusado")}
                disabled={submitting || !signature}
              >
                Recusar
              </Button>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
