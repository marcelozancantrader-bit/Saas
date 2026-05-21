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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Sparkles, Loader2 } from "lucide-react";
import { fetchPlanoDirectorAction } from "@/server/actions/zoneamento/fetch-plano-diretor.action";

type Props = {
  projectId: string;
  defaultCidade?: string;
  defaultUf?: string;
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

export function BuscarPlanoDiretorButton({ projectId, defaultCidade, defaultUf }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [cidade, setCidade] = useState(defaultCidade ?? "");
  const [uf, setUf] = useState((defaultUf ?? "SP").toUpperCase());
  const [pending, startTransition] = useTransition();

  function handleSubmit() {
    if (!cidade.trim() || !uf.trim()) {
      toast.error("Informe cidade e UF.");
      return;
    }
    startTransition(async () => {
      const r = await fetchPlanoDirectorAction({
        project_id: projectId,
        cidade_nome: cidade.trim(),
        uf: uf.trim().toUpperCase(),
      });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success(
        `Zoneamento carregado pela IA (confiança ${r.confianca}). Custo: $${r.usd_cost.toFixed(4)}.`,
        { duration: 6000 },
      );
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-300"
      >
        <Sparkles className="mr-1.5 h-3.5 w-3.5" />
        Buscar plano diretor com IA
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              Buscar plano diretor automaticamente
            </DialogTitle>
            <DialogDescription>
              A IA (Claude Sonnet 4.6) vai consultar o plano diretor da cidade informada e retornar
              parâmetros de zoneamento residencial unifamiliar. Custo estimado:{" "}
              <strong>~$0,005</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-[1fr_120px]">
              <div className="space-y-1.5">
                <Label htmlFor="bd_cidade">Cidade</Label>
                <Input
                  id="bd_cidade"
                  value={cidade}
                  onChange={(e) => setCidade(e.target.value)}
                  placeholder="Ex.: Joinville"
                  disabled={pending}
                  autoFocus
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="bd_uf">UF</Label>
                <select
                  id="bd_uf"
                  value={uf}
                  onChange={(e) => setUf(e.target.value)}
                  disabled={pending}
                  className="w-full rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900"
                >
                  {UFS.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
              ⚠ Dados sujeitos à confiança da IA. A IA marcará o resultado com{" "}
              <strong>alta / média / baixa</strong> confiança. Sempre verifique com a prefeitura ou
              IPLAN/IPPUC antes de protocolar projeto.
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={pending}>
              {pending ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  Consultando IA…
                </>
              ) : (
                <>
                  <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                  Buscar agora
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
