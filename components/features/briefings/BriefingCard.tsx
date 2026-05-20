"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { requestBriefingAction } from "@/server/actions/briefings/request.action";
import {
  TIPO_OBRA_LABEL,
  ORCAMENTO_LABEL,
  ESTILO_LABEL,
  type BriefingRespostas,
} from "@/lib/validators/briefing.schema";

type BriefingProp = {
  id: string;
  status: "aguardando_cliente" | "preenchido" | "arquivado";
  enviado_em: string | null;
  preenchido_em: string | null;
  respostas: BriefingRespostas | null;
} | null;

type Props = {
  projectId: string;
  briefing: BriefingProp;
  portalUrl: string | null;
};

export function BriefingCard({ projectId, briefing, portalUrl }: Props) {
  const [pending, setPending] = useState(false);

  async function request() {
    setPending(true);
    try {
      const r = await requestBriefingAction({ project_id: projectId });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      if (portalUrl) {
        const full = `${window.location.origin}${portalUrl}`;
        await navigator.clipboard.writeText(full).catch(() => {});
        toast.success("Briefing pendente — link do portal copiado.");
      } else {
        toast.success("Briefing pendente.");
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base">Briefing inicial</CardTitle>
            <Badge variant="outline" className="text-[10px]">
              Opcional
            </Badge>
          </div>
          {briefing ? (
            <Badge
              variant={
                briefing.status === "preenchido"
                  ? "default"
                  : briefing.status === "aguardando_cliente"
                    ? "secondary"
                    : "outline"
              }
            >
              {briefing.status === "preenchido"
                ? "Preenchido"
                : briefing.status === "aguardando_cliente"
                  ? "Aguardando cliente"
                  : "Arquivado"}
            </Badge>
          ) : null}
        </div>
        <p className="mt-1 text-[11px] text-zinc-500">
          Esta etapa não é obrigatória — você pode pular pra geração de documentos sem briefing.
        </p>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {!briefing || briefing.status === "arquivado" ? (
          <>
            <p className="text-zinc-600 dark:text-zinc-400">
              Quando preenchido, reduz idas-e-vindas e dá contexto pra IA gerar docs mais alinhados
              com a expectativa do cliente.
            </p>
            <Button onClick={request} disabled={pending || !portalUrl} size="sm">
              {pending ? "Enviando…" : "Solicitar briefing"}
            </Button>
            {!portalUrl ? (
              <p className="text-xs text-amber-700 dark:text-amber-400">
                Vincule um cliente ao projeto pra ter um link de portal.
              </p>
            ) : null}
          </>
        ) : briefing.status === "aguardando_cliente" ? (
          <>
            <p className="text-zinc-600 dark:text-zinc-400">
              Aguardando o cliente preencher pelo portal. Reenvie o link se necessário.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={request}
                disabled={pending || !portalUrl}
                size="sm"
                variant="outline"
              >
                {pending ? "…" : "Reenviar link"}
              </Button>
              {portalUrl ? (
                <a
                  href={portalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="self-center text-xs text-zinc-500 underline-offset-2 hover:underline"
                >
                  {portalUrl}
                </a>
              ) : null}
            </div>
          </>
        ) : (
          <BriefingAnswers respostas={briefing.respostas} preenchidoEm={briefing.preenchido_em} />
        )}
      </CardContent>
    </Card>
  );
}

function BriefingAnswers({
  respostas,
  preenchidoEm,
}: {
  respostas: BriefingRespostas | null;
  preenchidoEm: string | null;
}) {
  if (!respostas) return <p className="text-zinc-500">Sem respostas registradas.</p>;

  const rows: Array<[string, string]> = [
    ["Tipo de obra", TIPO_OBRA_LABEL[respostas.tipo_obra]],
    ["Estilo", ESTILO_LABEL[respostas.estilo_preferido]],
    ["Orçamento", ORCAMENTO_LABEL[respostas.orcamento_estimado]],
    ["Prazo", `${respostas.prazo_desejado_meses} meses`],
    [
      "Programa",
      `${respostas.quartos} quartos · ${respostas.suites} suítes · ${respostas.banheiros} banheiros · ${respostas.vagas_garagem} vagas`,
    ],
    ["Moradores", respostas.moradores || "—"],
    ["Pets", respostas.tem_pets ? respostas.pets_detalhes || "Sim" : "Não"],
  ];

  return (
    <div className="space-y-3">
      <p className="text-xs text-zinc-500">
        Preenchido em {preenchidoEm ? new Date(preenchidoEm).toLocaleString("pt-BR") : "—"}
      </p>

      <dl className="grid gap-2 sm:grid-cols-2">
        {rows.map(([k, v]) => (
          <div key={k}>
            <dt className="text-xs tracking-wider text-zinc-500 uppercase">{k}</dt>
            <dd className="text-sm">{v}</dd>
          </div>
        ))}
      </dl>

      {respostas.ambientes_especiais.length > 0 ? (
        <div>
          <p className="text-xs tracking-wider text-zinc-500 uppercase">Ambientes especiais</p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {respostas.ambientes_especiais.map((a) => (
              <Badge key={a} variant="outline">
                {a}
              </Badge>
            ))}
          </div>
        </div>
      ) : null}

      {respostas.restricoes ? (
        <div>
          <p className="text-xs tracking-wider text-zinc-500 uppercase">Restrições</p>
          <p className="text-sm whitespace-pre-wrap">{respostas.restricoes}</p>
        </div>
      ) : null}

      {respostas.inspiracoes ? (
        <div>
          <p className="text-xs tracking-wider text-zinc-500 uppercase">Inspirações</p>
          <p className="text-sm whitespace-pre-wrap">{respostas.inspiracoes}</p>
        </div>
      ) : null}

      {respostas.observacoes ? (
        <div>
          <p className="text-xs tracking-wider text-zinc-500 uppercase">Observações</p>
          <p className="text-sm whitespace-pre-wrap">{respostas.observacoes}</p>
        </div>
      ) : null}
    </div>
  );
}
