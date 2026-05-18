"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { respondScopeChangeAction } from "@/server/actions/scope-changes/respond.action";

export type ScopeChangeForProf = {
  id: string;
  descricao: string;
  urgencia: "baixa" | "media" | "alta" | null;
  solicitado_por: "cliente" | "profissional";
  status: "pendente_analise" | "aguardando_cliente" | "aprovado" | "recusado" | "cancelado";
  valor_aditivo: number | null;
  prazo_adicional_dias: number | null;
  created_at: string;
  resolvido_em: string | null;
};

type Props = { scopeChanges: ScopeChangeForProf[] };

const STATUS_LABEL: Record<ScopeChangeForProf["status"], string> = {
  pendente_analise: "Aguardando sua resposta",
  aguardando_cliente: "Aguardando cliente",
  aprovado: "Aprovado",
  recusado: "Recusado",
  cancelado: "Cancelado",
};

const STATUS_VARIANT: Record<
  ScopeChangeForProf["status"],
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

export function ScopeChangesCard({ scopeChanges }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Alterações de escopo</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {scopeChanges.length === 0 ? (
          <p className="text-sm text-zinc-500">
            Nenhuma solicitação ainda. Quando o cliente pedir algo pelo portal, aparece aqui.
          </p>
        ) : (
          scopeChanges.map((sc) => <ScopeChangeRow key={sc.id} sc={sc} />)
        )}
      </CardContent>
    </Card>
  );
}

function ScopeChangeRow({ sc }: { sc: ScopeChangeForProf }) {
  const [open, setOpen] = useState(false);
  const [valor, setValor] = useState<string>("");
  const [prazo, setPrazo] = useState<string>("");
  const [obs, setObs] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  async function respond(decisao: "aceitar" | "recusar") {
    setSubmitting(true);
    try {
      const r = await respondScopeChangeAction({
        scope_change_id: sc.id,
        decisao,
        valor_aditivo: decisao === "aceitar" && valor ? Number(valor) : null,
        prazo_adicional_dias: decisao === "aceitar" && prazo ? parseInt(prazo, 10) : null,
        observacoes: obs.trim() || undefined,
      });
      if (!r.ok) toast.error(r.error);
      else
        toast.success(
          decisao === "aceitar"
            ? "Proposta enviada ao cliente para aprovação."
            : "Solicitação recusada.",
        );
      setOpen(false);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="rounded border border-zinc-200 p-3 dark:border-zinc-800">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs text-zinc-500">
            {sc.solicitado_por === "cliente" ? "Solicitação do cliente" : "Iniciada por você"} ·{" "}
            {new Date(sc.created_at).toLocaleString("pt-BR")}
            {sc.urgencia ? ` · urgência ${sc.urgencia}` : null}
          </p>
          <p className="mt-1 text-sm whitespace-pre-wrap">{sc.descricao}</p>
        </div>
        <Badge variant={STATUS_VARIANT[sc.status]}>{STATUS_LABEL[sc.status]}</Badge>
      </div>

      {sc.status !== "pendente_analise" &&
      (sc.valor_aditivo !== null || sc.prazo_adicional_dias !== null) ? (
        <div className="mt-3 grid grid-cols-2 gap-3 rounded bg-zinc-50 p-2 text-xs dark:bg-zinc-900">
          <div>
            <span className="text-zinc-500">Aditivo: </span>
            <strong>{brl(sc.valor_aditivo)}</strong>
          </div>
          <div>
            <span className="text-zinc-500">Prazo extra: </span>
            <strong>
              {sc.prazo_adicional_dias !== null ? `${sc.prazo_adicional_dias} dias` : "—"}
            </strong>
          </div>
        </div>
      ) : null}

      {sc.status === "pendente_analise" ? (
        <div className="mt-3 space-y-2">
          {!open ? (
            <div className="flex gap-2">
              <Button size="sm" onClick={() => setOpen(true)}>
                Responder
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => respond("recusar")}
                disabled={submitting}
              >
                Recusar direto
              </Button>
            </div>
          ) : (
            <div className="space-y-2 rounded border border-zinc-200 p-3 dark:border-zinc-800">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs tracking-wider text-zinc-500 uppercase">
                    Valor do aditivo (R$)
                  </label>
                  <Input
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    min="0"
                    value={valor}
                    onChange={(e) => setValor(e.target.value)}
                    placeholder="0,00"
                  />
                </div>
                <div>
                  <label className="block text-xs tracking-wider text-zinc-500 uppercase">
                    Prazo adicional (dias)
                  </label>
                  <Input
                    type="number"
                    inputMode="numeric"
                    min="0"
                    value={prazo}
                    onChange={(e) => setPrazo(e.target.value)}
                    placeholder="0"
                  />
                </div>
              </div>
              <Textarea
                value={obs}
                onChange={(e) => setObs(e.target.value)}
                rows={2}
                placeholder="Observações internas (opcional, só você vê)"
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={() => respond("aceitar")} disabled={submitting}>
                  Enviar proposta ao cliente
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => respond("recusar")}
                  disabled={submitting}
                >
                  Recusar
                </Button>
                <Button size="sm" variant="outline" onClick={() => setOpen(false)}>
                  Cancelar
                </Button>
              </div>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
