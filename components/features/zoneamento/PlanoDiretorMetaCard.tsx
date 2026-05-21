"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertTriangle,
  Calendar,
  ExternalLink,
  Info,
  MapPin,
  RefreshCw,
  Sparkles,
  Star,
} from "lucide-react";

export type PlanoDiretorMetaProps = {
  origem: "curada" | "ia";
  cidade_nome: string;
  uf: string;
  lei: string;
  ano_lei: number | null;
  ultima_revisao_ano?: number | null;
  fonte_url: string | null;
  confianca?: "alta" | "media" | "baixa" | null;
  /** ISO timestamp de quando a IA foi consultada. */
  consultado_em?: string | null;
  /** Custo da consulta em USD pra transparência. */
  usd_cost?: number | null;
  zona_label?: string | null;
  zona_observacao?: string | null;
  onRefresh?: () => void;
  refreshing?: boolean;
};

export function PlanoDiretorMetaCard(props: PlanoDiretorMetaProps) {
  const refAno = props.ultima_revisao_ano ?? props.ano_lei;
  const anosLei = refAno ? new Date().getFullYear() - refAno : null;
  const isAntiga = anosLei !== null && anosLei > 10;
  const prefeituraSearchUrl = `https://www.google.com/search?q=prefeitura+${encodeURIComponent(
    props.cidade_nome,
  )}+${props.uf}+plano+diretor`;

  return (
    <div className="space-y-3 rounded-lg border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-start justify-between gap-3 border-b border-zinc-200 pb-3 dark:border-zinc-800">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            {props.origem === "curada" ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold tracking-wider text-amber-700 uppercase dark:text-amber-400">
                <Star className="h-3.5 w-3.5 fill-amber-400" />
                Regras curadas
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold tracking-wider text-purple-700 uppercase dark:text-purple-400">
                <Sparkles className="h-3.5 w-3.5" />
                Buscado pela IA
              </span>
            )}
            {props.consultado_em ? (
              <span className="text-[10px] text-zinc-400">
                · {tempoDecorrido(props.consultado_em)}
              </span>
            ) : null}
            {props.usd_cost && props.usd_cost > 0 ? (
              <span className="text-[10px] text-zinc-400">· custo {formatUsd(props.usd_cost)}</span>
            ) : null}
          </div>
          <h3 className="mt-1 flex items-center gap-1.5 text-base font-semibold text-zinc-900 dark:text-zinc-50">
            <MapPin className="h-4 w-4 text-zinc-400" />
            {props.cidade_nome}/{props.uf}
            {props.zona_label ? (
              <span className="text-sm font-normal text-zinc-500">· {props.zona_label}</span>
            ) : null}
          </h3>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          {props.confianca ? (
            <Badge
              variant={
                props.confianca === "alta"
                  ? "default"
                  : props.confianca === "media"
                    ? "secondary"
                    : "destructive"
              }
            >
              Confiança {props.confianca}
            </Badge>
          ) : null}
          {props.onRefresh ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={props.onRefresh}
              disabled={props.refreshing}
              className="h-6 gap-1 px-2 text-[10px]"
            >
              <RefreshCw className={`h-3 w-3 ${props.refreshing ? "animate-spin" : ""}`} />
              Refazer busca
            </Button>
          ) : null}
        </div>
      </div>

      <div>
        <p className="text-[10px] font-medium tracking-wider text-zinc-500 uppercase">
          Lei vigente
        </p>
        <p className="mt-0.5 text-sm font-medium text-zinc-900 dark:text-zinc-50">{props.lei}</p>
        {refAno ? (
          <p className="mt-0.5 flex flex-wrap items-center gap-1 text-xs text-zinc-500">
            <Calendar className="h-3 w-3" />
            {props.ultima_revisao_ano && props.ano_lei
              ? `Lei ${props.ano_lei}, revisada em ${props.ultima_revisao_ano}`
              : props.ano_lei
                ? `Vigente desde ${props.ano_lei}`
                : null}
            {anosLei !== null ? (
              <span className={isAntiga ? "font-medium text-amber-600 dark:text-amber-400" : ""}>
                · {anosLei} {anosLei === 1 ? "ano" : "anos"}
              </span>
            ) : null}
          </p>
        ) : null}
      </div>

      {isAntiga ? (
        <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-2.5 text-xs dark:border-amber-900 dark:bg-amber-950/40">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
          <p className="text-amber-900 dark:text-amber-100">
            Lei com mais de 10 anos sem revisão registrada. Confirme com a prefeitura se há decretos
            ou leis complementares recentes antes de aprovar o projeto.
          </p>
        </div>
      ) : null}

      {props.fonte_url ? (
        <div>
          <p className="text-[10px] font-medium tracking-wider text-zinc-500 uppercase">
            Fonte oficial
          </p>
          <a
            href={props.fonte_url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 inline-flex items-center gap-1.5 rounded-md border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 transition-colors hover:border-blue-300 hover:bg-blue-100 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-300 dark:hover:bg-blue-950"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Abrir lei no site oficial
          </a>
          <p className="mt-1 truncate text-[10px] text-zinc-400">{props.fonte_url}</p>
        </div>
      ) : null}

      {props.zona_observacao ? (
        <div>
          <p className="text-[10px] font-medium tracking-wider text-zinc-500 uppercase">
            Observação da IA sobre esta zona
          </p>
          <p className="mt-1 flex items-start gap-1.5 rounded-md border border-zinc-200 bg-zinc-50 p-2 text-xs text-zinc-700 italic dark:border-zinc-800 dark:bg-zinc-950/60 dark:text-zinc-300">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-zinc-400" />
            {props.zona_observacao}
          </p>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-zinc-200 pt-3 text-[11px] dark:border-zinc-800">
        <p className="flex-1 text-zinc-500">
          ⚠ <strong>Pré-validação:</strong>{" "}
          {props.origem === "ia"
            ? "estes parâmetros foram sugeridos por IA"
            : "estas regras vêm da nossa curadoria"}
          . Confirme com a prefeitura antes de aprovar o projeto definitivo.
        </p>
        <a
          href={prefeituraSearchUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-600 underline-offset-2 hover:underline dark:text-blue-400"
        >
          Buscar prefeitura
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>
    </div>
  );
}

function tempoDecorrido(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "agora há pouco";
  if (min === 1) return "há 1 min";
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h === 1) return "há 1 hora";
  if (h < 24) return `há ${h} horas`;
  const d = Math.floor(h / 24);
  if (d === 1) return "ontem";
  return `há ${d} dias`;
}

function formatUsd(usd: number): string {
  if (usd < 0.01) return `< $0.01`;
  return `$${usd.toFixed(3)}`;
}
