"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { generateBudgetAction } from "@/server/actions/budgets/generate.action";
import { toast } from "sonner";
import { RefreshCwIcon } from "lucide-react";

const MES_LABEL = [
  "jan",
  "fev",
  "mar",
  "abr",
  "mai",
  "jun",
  "jul",
  "ago",
  "set",
  "out",
  "nov",
  "dez",
];

function formatMes(iso: string): string {
  const m = iso.match(/^(\d{4})-(\d{2})/);
  if (!m) return iso;
  const ano = m[1]!;
  const mes = MES_LABEL[Number(m[2]) - 1] ?? "—";
  return `${mes}/${ano}`;
}

function regimeLabel(v: string): string {
  return v === "true" ? "Desonerado" : "Não-desonerado";
}

type Props = {
  projectId: string;
  /** Valores pré-preenchidos vindos do orçamento atual */
  defaults?: {
    uf?: string;
    mes_referencia?: string;
    desonerado?: boolean;
    bdi_pct?: number;
  };
  /** UFs com dados SINAPI cadastrados — vem do server (loadSinapiCatalog). */
  availableUfs: string[];
  /** Meses disponíveis por UF, do mais recente pro mais antigo. */
  mesesPorUf: Record<string, string[]>;
  variant?: "default" | "outline" | "secondary";
  label?: string;
};

export function RegenerateBudgetButton({
  projectId,
  defaults,
  availableUfs,
  mesesPorUf,
  variant = "outline",
  label = "Regerar orçamento",
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const fallbackUf = availableUfs[0] ?? "SP";
  const [uf, setUf] = useState(defaults?.uf ?? fallbackUf);
  const mesesParaUf = mesesPorUf[uf] ?? [];
  const fallbackMes = mesesParaUf[0] ?? defaults?.mes_referencia ?? "2026-05-01";
  const [mesRef, setMesRef] = useState(defaults?.mes_referencia ?? fallbackMes);
  const [desonerado, setDesonerado] = useState<"true" | "false">(
    defaults?.desonerado === false ? "false" : "true",
  );
  const [bdi, setBdi] = useState(defaults?.bdi_pct?.toString() ?? "28");

  function changeUf(newUf: string) {
    setUf(newUf);
    const meses = mesesPorUf[newUf] ?? [];
    if (meses.length > 0 && !meses.includes(mesRef)) {
      setMesRef(meses[0]!);
    }
  }

  function handle() {
    const bdiNum = Number(bdi);
    if (isNaN(bdiNum) || bdiNum < 0 || bdiNum > 100) {
      toast.error("BDI deve ser um número entre 0 e 100");
      return;
    }

    startTransition(async () => {
      const result = await generateBudgetAction({
        project_id: projectId,
        uf,
        mes_referencia: mesRef,
        desonerado: desonerado === "true",
        bdi_pct: bdiNum,
      });
      if (result.ok) {
        toast.success(
          `Nova versão gerada — ${result.items_count} itens, R$ ${Number(result.total_com_bdi).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
        );
        setOpen(false);
        router.push(`/projetos/${projectId}/orcamento/${result.budget_id}`);
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant={variant} size="sm">
            <RefreshCwIcon className="mr-1.5 h-3.5 w-3.5" />
            {label}
          </Button>
        }
      />

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Regerar orçamento</DialogTitle>
          <DialogDescription>
            Cria uma nova versão do orçamento com os parâmetros abaixo. A versão atual permanece
            arquivada e acessível.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="regen_uf">UF</Label>
              <Select value={uf} onValueChange={(v) => v && changeUf(v)} disabled={pending}>
                <SelectTrigger id="regen_uf">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {availableUfs.map((v) => (
                      <SelectItem key={v} value={v}>
                        {v}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="regen_mes">Mês de referência</Label>
              <Select
                value={mesRef}
                onValueChange={(v) => v && setMesRef(v)}
                disabled={pending || mesesParaUf.length === 0}
              >
                <SelectTrigger id="regen_mes">
                  <span>{formatMes(mesRef)}</span>
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {mesesParaUf.length === 0 ? (
                      <SelectItem value={mesRef}>{formatMes(mesRef)}</SelectItem>
                    ) : (
                      mesesParaUf.map((v) => (
                        <SelectItem key={v} value={v}>
                          {formatMes(v)}
                        </SelectItem>
                      ))
                    )}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="regen_regime">Regime tributário</Label>
              <Select
                value={desonerado}
                onValueChange={(v) => v && setDesonerado(v as "true" | "false")}
                disabled={pending}
              >
                <SelectTrigger id="regen_regime">
                  <span>{regimeLabel(desonerado)}</span>
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="true">Desonerado</SelectItem>
                    <SelectItem value="false">Não-desonerado</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="regen_bdi">BDI (%)</Label>
              <Input
                id="regen_bdi"
                type="number"
                step="0.5"
                min="0"
                max="100"
                value={bdi}
                onChange={(e) => setBdi(e.target.value)}
                disabled={pending}
              />
            </div>
          </div>

          <p className="text-xs text-zinc-500">
            Tipico em obra residencial brasileira: BDI 25-35%. Padrão recomendado: 28%.
          </p>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
            Cancelar
          </Button>
          <Button onClick={handle} disabled={pending}>
            {pending ? "Gerando…" : "Gerar nova versão"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
