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

// Shape mirrors lib/ai/prompts/extract-floor-plan.v1 → FloorPlanExtraction
// (kept loose here to avoid pulling server-only imports into a client component)
type Ambiente = {
  nome: string;
  area_m2: number | null;
  tipo: string;
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

  function onConfirm() {
    startTransition(async () => {
      const result = await confirmExtractionAction({
        project_id: projectId,
        source_file_id: sourceFileId,
        area_total_m2: areaTotal === "" ? null : Number(areaTotal),
        numero_pavimentos: pavimentos === "" ? null : Number(pavimentos),
        tipologia,
        padrao_construtivo: padrao === "" ? null : (padrao as (typeof PADRAO_VALUES)[number]),
      });
      if (result.ok) {
        toast.success("Extração confirmada. Dados atualizados no projeto.");
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
