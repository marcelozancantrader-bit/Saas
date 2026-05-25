"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { confirmExtractionAction } from "@/server/actions/extraction/confirm-extraction.action";
import {
  PADRAO_LABEL,
  PADRAO_VALUES,
  TIPOLOGIA_LABEL,
  TIPOLOGIA_VALUES,
} from "@/lib/validators/projects.schema";
import { toast } from "sonner";

// Shape mirrors lib/ai/prompts/extract-floor-plan.v2 → FloorPlanExtraction
// (kept loose here to avoid pulling server-only imports into a client component)
type Ambiente = {
  nome: string;
  area_m2: number | null;
  tipo: string;
};

export type QuantitativosData = {
  portas_internas: number;
  portas_externas: number;
  janelas_grandes: number;
  janelas_pequenas: number;
  bacios: number;
  lavatorios: number;
  pias_cozinha: number;
  m_rodape: number | null;
  m2_rev_parede: number | null;
};

export type ExtractionData = {
  area_total_m2: number | null;
  area_terreno_m2: number | null;
  ambientes: Ambiente[];
  numero_pavimentos: number | null;
  tipologia: (typeof TIPOLOGIA_VALUES)[number];
  padrao_construtivo: (typeof PADRAO_VALUES)[number] | null;
  elementos_especiais: {
    piscina: boolean;
    churrasqueira: boolean;
    sacada: boolean;
    garagem: boolean;
    jardim: boolean;
    area_servico_externa: boolean;
  };
  /** Disponível para projetos extraídos com prompt v2+. */
  quantitativos?: QuantitativosData;
  observacoes: string;
  confianca: "alta" | "media" | "baixa";
};

type Props = {
  projectId: string;
  sourceFileId: string;
  extraction: ExtractionData;
  confirmedByUser: boolean;
  promptVersion?: string;
  usdCost?: number;
};

const CONFIANCA_BADGE: Record<
  ExtractionData["confianca"],
  "default" | "secondary" | "destructive"
> = {
  alta: "default",
  media: "secondary",
  baixa: "destructive",
};

export function ExtractionReview({
  projectId,
  sourceFileId,
  extraction,
  confirmedByUser,
  promptVersion,
  usdCost,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  // Editable fields
  const [areaTotal, setAreaTotal] = useState(extraction.area_total_m2?.toString() ?? "");
  const [pavimentos, setPavimentos] = useState(extraction.numero_pavimentos?.toString() ?? "");
  const [tipologia, setTipologia] = useState<(typeof TIPOLOGIA_VALUES)[number]>(
    extraction.tipologia,
  );
  const [padrao, setPadrao] = useState<string>(extraction.padrao_construtivo ?? "");

  // Quantitativos editáveis (prompt v2). Projetos antigos não têm — campos
  // ficam vazios e o orçamento cai no fallback heurístico.
  const q = extraction.quantitativos;
  const [portasInt, setPortasInt] = useState(q?.portas_internas?.toString() ?? "");
  const [portasExt, setPortasExt] = useState(q?.portas_externas?.toString() ?? "");
  const [janelasG, setJanelasG] = useState(q?.janelas_grandes?.toString() ?? "");
  const [janelasP, setJanelasP] = useState(q?.janelas_pequenas?.toString() ?? "");
  const [bacios, setBacios] = useState(q?.bacios?.toString() ?? "");
  const [lavatorios, setLavatorios] = useState(q?.lavatorios?.toString() ?? "");
  const [piasCozinha, setPiasCozinha] = useState(q?.pias_cozinha?.toString() ?? "");
  const [mRodape, setMRodape] = useState(q?.m_rodape?.toString() ?? "");
  const [m2RevParede, setM2RevParede] = useState(q?.m2_rev_parede?.toString() ?? "");

  function buildQuantitativosPayload(): QuantitativosData | undefined {
    // Se a IA não retornou quantitativos e usuário não preencheu nada, omitimos.
    const anyFilled =
      [portasInt, portasExt, janelasG, janelasP, bacios, lavatorios, piasCozinha].some(
        (v) => v !== "",
      ) ||
      mRodape !== "" ||
      m2RevParede !== "";
    if (!q && !anyFilled) return undefined;

    const intOrZero = (s: string) => (s === "" ? 0 : Math.max(0, Math.floor(Number(s))));
    const numOrNull = (s: string) => (s === "" ? null : Math.max(0, Number(s)));
    return {
      portas_internas: intOrZero(portasInt),
      portas_externas: intOrZero(portasExt),
      janelas_grandes: intOrZero(janelasG),
      janelas_pequenas: intOrZero(janelasP),
      bacios: intOrZero(bacios),
      lavatorios: intOrZero(lavatorios),
      pias_cozinha: intOrZero(piasCozinha),
      m_rodape: numOrNull(mRodape),
      m2_rev_parede: numOrNull(m2RevParede),
    };
  }

  function onConfirm() {
    startTransition(async () => {
      const result = await confirmExtractionAction({
        project_id: projectId,
        source_file_id: sourceFileId,
        area_total_m2: areaTotal === "" ? null : Number(areaTotal),
        numero_pavimentos: pavimentos === "" ? null : Number(pavimentos),
        tipologia,
        padrao_construtivo: padrao === "" ? null : (padrao as (typeof PADRAO_VALUES)[number]),
        quantitativos: buildQuantitativosPayload(),
      });
      if (result.ok) {
        toast.success(
          "✅ Extração confirmada! Próximo passo: revise as Validações (NBR + zoneamento).",
          { duration: 6000 },
        );
        // Redireciona pra aba de validações pra o user ver o próximo passo
        router.push(`/projetos/${projectId}?tab=validacao`);
        router.refresh();
      } else if ("error" in result) {
        toast.error(result.error);
      } else {
        toast.error("Verifique os campos.");
      }
    });
  }

  const elementosTrue = Object.entries(extraction.elementos_especiais)
    .filter(([, v]) => v)
    .map(([k]) => k.replace(/_/g, " "));

  // Avisos críticos pra mostrar antes da revisão
  const areaIsMissing = !areaTotal || Number(areaTotal) <= 0;
  const padraoIsMissing = !padrao;
  const lowConfidence = extraction.confianca === "baixa";
  const showCriticalAlert = areaIsMissing || padraoIsMissing;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <Badge variant={CONFIANCA_BADGE[extraction.confianca]}>
          Confiança: {extraction.confianca}
        </Badge>
        {confirmedByUser ? (
          <Badge variant="outline">✓ Confirmado por você</Badge>
        ) : (
          <Badge variant="outline">Aguardando revisão</Badge>
        )}
        {promptVersion ? (
          <span className="text-xs text-zinc-500">prompt {promptVersion}</span>
        ) : null}
        {usdCost !== undefined ? (
          <span className="text-xs text-zinc-500">custo IA: ${usdCost.toFixed(4)}</span>
        ) : null}
      </div>

      {showCriticalAlert && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm dark:border-amber-900 dark:bg-amber-950/30">
          <p className="font-medium text-amber-900 dark:text-amber-200">
            ⚠ A IA não conseguiu extrair{" "}
            {areaIsMissing && padraoIsMissing
              ? "a área total e o padrão construtivo"
              : areaIsMissing
                ? "a área total"
                : "o padrão construtivo"}{" "}
            da planta
          </p>
          <p className="mt-1 text-xs text-amber-800 dark:text-amber-300">
            {areaIsMissing && (
              <>
                Sem a <strong>área total</strong>, o orçamento SINAPI fica subdimensionado e o check
                vs CUB não funciona.{" "}
              </>
            )}
            {padraoIsMissing && (
              <>
                Sem o <strong>padrão construtivo</strong>, a precificação de revestimentos e a
                comparação com o CUB ficam imprecisas.{" "}
              </>
            )}
            Edite os campos abaixo manualmente antes de confirmar.
          </p>
        </div>
      )}

      {lowConfidence && !showCriticalAlert && (
        <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-3 text-xs text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/20 dark:text-amber-200">
          🤖 IA marcou esta extração como <strong>confiança baixa</strong> — revise com atenção os
          valores antes de confirmar (sobretudo área total e padrão construtivo).
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="ext_area_total">Área total (m²)</Label>
          <Input
            id="ext_area_total"
            type="number"
            step="0.01"
            min="0"
            value={areaTotal}
            onChange={(e) => setAreaTotal(e.target.value)}
            disabled={pending}
            placeholder="—"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ext_pavimentos">Nº de pavimentos</Label>
          <Input
            id="ext_pavimentos"
            type="number"
            step="1"
            min="1"
            value={pavimentos}
            onChange={(e) => setPavimentos(e.target.value)}
            disabled={pending}
            placeholder="—"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Tipologia</Label>
          <Select
            value={tipologia}
            onValueChange={(v) => {
              if (v) setTipologia(v as (typeof TIPOLOGIA_VALUES)[number]);
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {TIPOLOGIA_VALUES.map((v) => (
                  <SelectItem key={v} value={v}>
                    {TIPOLOGIA_LABEL[v]}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Padrão construtivo</Label>
          <Select value={padrao} onValueChange={(v) => setPadrao(v ?? "")}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="— não definido —" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {PADRAO_VALUES.map((v) => (
                  <SelectItem key={v} value={v}>
                    {PADRAO_LABEL[v]}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
      </div>

      {extraction.ambientes.length > 0 ? (
        <div>
          <p className="mb-2 text-sm font-medium">Ambientes ({extraction.ambientes.length})</p>
          <div className="overflow-hidden rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 text-xs text-zinc-500 uppercase dark:bg-zinc-900">
                <tr>
                  <th className="px-3 py-1.5 text-left font-medium">Ambiente</th>
                  <th className="px-3 py-1.5 text-left font-medium">Tipo</th>
                  <th className="px-3 py-1.5 text-right font-medium">Área (m²)</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {extraction.ambientes.map((a, i) => (
                  <tr key={`${a.nome}-${i}`}>
                    <td className="px-3 py-1.5">{a.nome}</td>
                    <td className="px-3 py-1.5 text-zinc-600 capitalize dark:text-zinc-400">
                      {a.tipo.replace(/_/g, " ")}
                    </td>
                    <td className="px-3 py-1.5 text-right text-zinc-600 dark:text-zinc-400">
                      {a.area_m2 !== null ? a.area_m2.toFixed(1) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {elementosTrue.length > 0 ? (
        <div className="space-y-1.5">
          <p className="text-sm font-medium">Elementos especiais</p>
          <div className="flex flex-wrap gap-1.5">
            {elementosTrue.map((e) => (
              <Badge key={e} variant="outline" className="capitalize">
                {e}
              </Badge>
            ))}
          </div>
        </div>
      ) : null}

      <div className="space-y-2 rounded-lg border border-blue-200 bg-blue-50/40 p-3 dark:border-blue-900/40 dark:bg-blue-950/20">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium">📊 Quantitativos da IA</p>
          {q ? (
            <Badge variant="outline" className="text-[10px]">
              Contado pelo prompt v2
            </Badge>
          ) : (
            <Badge variant="outline" className="text-[10px]">
              Não disponível — heurística será usada
            </Badge>
          )}
        </div>
        <p className="text-xs text-zinc-600 dark:text-zinc-400">
          Itens que entram direto no orçamento SINAPI. Edite se a IA contou errado — ao confirmar, o
          orçamento usa esses valores no lugar das estimativas automáticas.
        </p>

        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <QtyInput
            label="Portas internas"
            value={portasInt}
            onChange={setPortasInt}
            disabled={pending}
          />
          <QtyInput
            label="Portas externas"
            value={portasExt}
            onChange={setPortasExt}
            disabled={pending}
          />
          <QtyInput
            label="Janelas grandes"
            value={janelasG}
            onChange={setJanelasG}
            disabled={pending}
          />
          <QtyInput
            label="Janelas pequenas"
            value={janelasP}
            onChange={setJanelasP}
            disabled={pending}
          />
          <QtyInput label="Bacios" value={bacios} onChange={setBacios} disabled={pending} />
          <QtyInput
            label="Lavatórios"
            value={lavatorios}
            onChange={setLavatorios}
            disabled={pending}
          />
          <QtyInput
            label="Pias de cozinha"
            value={piasCozinha}
            onChange={setPiasCozinha}
            disabled={pending}
          />
          <QtyInput
            label="Rodapé (m)"
            value={mRodape}
            onChange={setMRodape}
            disabled={pending}
            step="0.1"
            placeholder="—"
          />
          <QtyInput
            label="Revest. parede (m²)"
            value={m2RevParede}
            onChange={setM2RevParede}
            disabled={pending}
            step="0.1"
            placeholder="—"
          />
        </div>
      </div>

      {extraction.observacoes ? (
        <div className="space-y-1.5">
          <p className="text-sm font-medium">Observações da IA</p>
          <p className="rounded-md bg-zinc-50 p-2 text-sm text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
            {extraction.observacoes}
          </p>
        </div>
      ) : null}

      <div className="flex justify-end">
        <Button onClick={onConfirm} disabled={pending}>
          {pending
            ? "Salvando…"
            : confirmedByUser
              ? "Re-confirmar e atualizar projeto"
              : "Confirmar e atualizar projeto"}
        </Button>
      </div>
    </div>
  );
}

function QtyInput({
  label,
  value,
  onChange,
  disabled,
  step,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  disabled: boolean;
  step?: string;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-[11px] tracking-wide text-zinc-600 uppercase dark:text-zinc-400">
        {label}
      </Label>
      <Input
        type="number"
        step={step ?? "1"}
        min="0"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder={placeholder ?? "0"}
        className="h-8"
      />
    </div>
  );
}
