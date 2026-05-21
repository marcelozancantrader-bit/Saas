"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { upsertCubAction } from "@/server/actions/admin/update-cub.action";
import type { CubMatrix, CubRow } from "@/server/services/admin-cub";
import { Pencil } from "lucide-react";

type Padrao = "popular" | "medio" | "alto" | "luxo";

const PADRAO_LABEL: Record<Padrao, string> = {
  popular: "Popular",
  medio: "Médio",
  alto: "Alto",
  luxo: "Luxo",
};

const UFS = [
  "AC",
  "AL",
  "AP",
  "AM",
  "BA",
  "CE",
  "DF",
  "ES",
  "GO",
  "MA",
  "MT",
  "MS",
  "MG",
  "PA",
  "PB",
  "PR",
  "PE",
  "PI",
  "RJ",
  "RN",
  "RS",
  "RO",
  "RR",
  "SC",
  "SP",
  "SE",
  "TO",
];

type EditState = {
  uf: string;
  padrao: Padrao;
  mes_referencia: string;
  faixa_min: string;
  faixa_max: string;
  fonte: string;
};

export function CubEditor({ matrix }: { matrix: CubMatrix }) {
  const router = useRouter();
  const [editing, setEditing] = useState<EditState | null>(null);
  const [pending, startTransition] = useTransition();

  const defaultMes = matrix.meses[0] ?? new Date().toISOString().slice(0, 8) + "01";

  function openEdit(uf: string, padrao: Padrao, current: CubRow | undefined) {
    setEditing({
      uf,
      padrao,
      mes_referencia: current?.mes_referencia ?? defaultMes,
      faixa_min: current?.faixa_min?.toString() ?? "",
      faixa_max: current?.faixa_max?.toString() ?? "",
      fonte: current?.fonte ?? "",
    });
  }

  function save() {
    if (!editing) return;
    const min = Number(editing.faixa_min);
    const max = Number(editing.faixa_max);
    if (!min || !max || min <= 0 || max <= 0 || min >= max) {
      toast.error("Valores inválidos. Mínimo precisa ser positivo e menor que o máximo.");
      return;
    }
    startTransition(async () => {
      const r = await upsertCubAction({
        uf: editing.uf,
        padrao: editing.padrao,
        mes_referencia: editing.mes_referencia,
        faixa_min: min,
        faixa_max: max,
        fonte: editing.fonte.trim() || null,
      });
      if (r.ok) {
        toast.success(`CUB ${editing.uf}/${PADRAO_LABEL[editing.padrao]} atualizado.`);
        setEditing(null);
        router.refresh();
      } else {
        toast.error(r.error);
      }
    });
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-zinc-800 bg-zinc-900/40">
      <table className="min-w-full text-xs">
        <thead className="bg-zinc-950/50 text-zinc-400">
          <tr>
            <th className="px-3 py-2 text-left">UF</th>
            {(Object.keys(PADRAO_LABEL) as Padrao[]).map((p) => (
              <th key={p} className="px-3 py-2 text-left">
                {PADRAO_LABEL[p]} <span className="text-zinc-600">(R$/m²)</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="text-zinc-200">
          {UFS.map((uf) => {
            const row = matrix.latest[uf] ?? {};
            return (
              <tr key={uf} className="border-t border-zinc-800/60">
                <td className="px-3 py-2 font-mono font-semibold">{uf}</td>
                {(Object.keys(PADRAO_LABEL) as Padrao[]).map((p) => {
                  const cell = row[p];
                  return (
                    <td key={p} className="px-3 py-2">
                      <button
                        type="button"
                        onClick={() => openEdit(uf, p, cell)}
                        className="group flex items-center gap-1.5 text-left"
                      >
                        {cell ? (
                          <span>
                            {cell.faixa_min.toLocaleString("pt-BR")} –{" "}
                            {cell.faixa_max.toLocaleString("pt-BR")}
                            <span className="ml-1 text-[10px] text-zinc-500">
                              ({cell.mes_referencia.slice(0, 7)})
                            </span>
                          </span>
                        ) : (
                          <span className="text-zinc-600">— cadastrar</span>
                        )}
                        <Pencil className="h-3 w-3 text-zinc-500 opacity-0 group-hover:opacity-100" />
                      </button>
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>

      <Dialog open={!!editing} onOpenChange={(v) => !pending && !v && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              CUB {editing?.uf} · {editing ? PADRAO_LABEL[editing.padrao] : ""}
            </DialogTitle>
            <DialogDescription>
              Faixa em R$/m² publicada pelo SINDUSCON estadual. Marque a fonte (URL ou referência)
              pra auditoria futura.
            </DialogDescription>
          </DialogHeader>

          {editing ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="cub_mes">Mês referência</Label>
                  <Select
                    value={editing.mes_referencia}
                    onValueChange={(v) => v && setEditing({ ...editing, mes_referencia: v })}
                    disabled={pending}
                  >
                    <SelectTrigger id="cub_mes">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {Array.from(new Set([...matrix.meses, editing.mes_referencia, defaultMes]))
                          .filter(Boolean)
                          .sort((a, b) => b.localeCompare(a))
                          .map((m) => (
                            <SelectItem key={m} value={m}>
                              {m.slice(0, 7)}
                            </SelectItem>
                          ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="cub_fonte">Fonte</Label>
                  <Input
                    id="cub_fonte"
                    value={editing.fonte}
                    onChange={(e) => setEditing({ ...editing, fonte: e.target.value })}
                    placeholder="ex: SINDUSCON-SP boletim 05/2026"
                    disabled={pending}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="cub_min">Faixa mínima (R$/m²)</Label>
                  <Input
                    id="cub_min"
                    type="number"
                    step="1"
                    value={editing.faixa_min}
                    onChange={(e) => setEditing({ ...editing, faixa_min: e.target.value })}
                    disabled={pending}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="cub_max">Faixa máxima (R$/m²)</Label>
                  <Input
                    id="cub_max"
                    type="number"
                    step="1"
                    value={editing.faixa_max}
                    onChange={(e) => setEditing({ ...editing, faixa_max: e.target.value })}
                    disabled={pending}
                  />
                </div>
              </div>
            </div>
          ) : null}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)} disabled={pending}>
              Cancelar
            </Button>
            <Button onClick={save} disabled={pending}>
              {pending ? "Salvando…" : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
