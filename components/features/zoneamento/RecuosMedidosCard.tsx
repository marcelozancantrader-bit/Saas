"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Ruler, CheckCircle2, AlertOctagon, AlertTriangle } from "lucide-react";
import { saveRecuosAction } from "@/server/actions/zoneamento/save-recuos.action";

type ZonaRule = {
  recuo_frontal_m: number | null;
  recuo_lateral_m: number | null;
  recuo_fundos_m: number | null;
};

type Initial = {
  frontal_m?: number | null;
  lateral_direito_m?: number | null;
  lateral_esquerdo_m?: number | null;
  fundos_m?: number | null;
  updated_at?: string | null;
};

type Props = {
  projectId: string;
  zona: ZonaRule | null;
  initial: Initial | null;
};

function compare(medido: number | null | undefined, exigido: number | null) {
  if (exigido == null || exigido <= 0) return { tone: "neutral", label: "Não exigido" };
  if (medido == null) return { tone: "warn", label: "Não medido" };
  if (medido >= exigido) return { tone: "ok", label: `OK (≥ ${exigido}m)` };
  return { tone: "issue", label: `Abaixo de ${exigido}m` };
}

export function RecuosMedidosCard({ projectId, zona, initial }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [frontal, setFrontal] = useState(initial?.frontal_m?.toString() ?? "");
  const [latDir, setLatDir] = useState(initial?.lateral_direito_m?.toString() ?? "");
  const [latEsq, setLatEsq] = useState(initial?.lateral_esquerdo_m?.toString() ?? "");
  const [fundos, setFundos] = useState(initial?.fundos_m?.toString() ?? "");

  function n(s: string): number | null {
    if (!s.trim()) return null;
    const v = Number(s.replace(",", "."));
    return Number.isFinite(v) ? v : null;
  }

  const previews = {
    frontal: compare(n(frontal), zona?.recuo_frontal_m ?? null),
    latDir: compare(n(latDir), zona?.recuo_lateral_m ?? null),
    latEsq: compare(n(latEsq), zona?.recuo_lateral_m ?? null),
    fundos: compare(n(fundos), zona?.recuo_fundos_m ?? null),
  };

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const r = await saveRecuosAction(fd);
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success("Recuos salvos. Zoneamento atualizado.");
      router.refresh();
    });
  }

  return (
    <Card className="border-zinc-200 dark:border-zinc-800">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-950/40">
            <Ruler className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </span>
          <div>
            <CardTitle className="text-base">Recuos medidos</CardTitle>
            <p className="text-xs text-zinc-500">
              Informe os recuos do projeto executivo pra validar contra o plano diretor.
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {!zona ? (
          <p className="text-sm text-zinc-500">
            Selecione cidade e zona primeiro pra ver os limites do plano diretor.
          </p>
        ) : (
          <form onSubmit={onSubmit} className="space-y-3">
            <input type="hidden" name="project_id" value={projectId} />

            <div className="grid gap-3 sm:grid-cols-2">
              <RecuoField
                id="frontal_m"
                label="Frontal (m)"
                value={frontal}
                setValue={setFrontal}
                exigido={zona.recuo_frontal_m}
                preview={previews.frontal}
                disabled={pending}
              />
              <RecuoField
                id="fundos_m"
                label="Fundos (m)"
                value={fundos}
                setValue={setFundos}
                exigido={zona.recuo_fundos_m}
                preview={previews.fundos}
                disabled={pending}
              />
              <RecuoField
                id="lateral_direito_m"
                label="Lateral direito (m)"
                value={latDir}
                setValue={setLatDir}
                exigido={zona.recuo_lateral_m}
                preview={previews.latDir}
                disabled={pending}
              />
              <RecuoField
                id="lateral_esquerdo_m"
                label="Lateral esquerdo (m)"
                value={latEsq}
                setValue={setLatEsq}
                exigido={zona.recuo_lateral_m}
                preview={previews.latEsq}
                disabled={pending}
              />
            </div>

            <div className="flex items-center justify-between gap-2 border-t border-zinc-200 pt-3 dark:border-zinc-800">
              {initial?.updated_at ? (
                <p className="text-[11px] text-zinc-500">
                  Atualizado em {new Date(initial.updated_at).toLocaleString("pt-BR")}
                </p>
              ) : (
                <p className="text-[11px] text-zinc-500">
                  Deixe em branco se ainda não mediu. Atualiza a validação imediatamente.
                </p>
              )}
              <Button type="submit" disabled={pending} size="sm">
                {pending ? "Salvando…" : "Salvar recuos"}
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}

function RecuoField({
  id,
  label,
  value,
  setValue,
  exigido,
  preview,
  disabled,
}: {
  id: string;
  label: string;
  value: string;
  setValue: (v: string) => void;
  exigido: number | null;
  preview: { tone: string; label: string };
  disabled?: boolean;
}) {
  const Icon =
    preview.tone === "ok"
      ? CheckCircle2
      : preview.tone === "issue"
        ? AlertOctagon
        : preview.tone === "warn"
          ? AlertTriangle
          : null;
  const iconColor =
    preview.tone === "ok"
      ? "text-emerald-600 dark:text-emerald-400"
      : preview.tone === "issue"
        ? "text-rose-600 dark:text-rose-400"
        : preview.tone === "warn"
          ? "text-amber-600 dark:text-amber-400"
          : "text-zinc-400";
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label htmlFor={id} className="text-sm">
          {label}
          {exigido != null && exigido > 0 ? (
            <span className="ml-1 text-[11px] text-zinc-500">(mín. {exigido}m)</span>
          ) : (
            <span className="ml-1 text-[11px] text-zinc-500">(não exigido)</span>
          )}
        </Label>
        {Icon ? (
          <span className={`inline-flex items-center gap-1 text-[10px] ${iconColor}`}>
            <Icon className="h-3 w-3" />
            {preview.label}
          </span>
        ) : null}
      </div>
      <Input
        id={id}
        name={id}
        type="number"
        step="0.1"
        min="0"
        max="50"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="—"
        disabled={disabled}
      />
    </div>
  );
}
