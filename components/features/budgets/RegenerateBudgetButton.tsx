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

type Props = {
  projectId: string;
  /** Valores pré-preenchidos vindos do orçamento atual */
  defaults?: {
    uf?: string;
    mes_referencia?: string;
    desonerado?: boolean;
    bdi_pct?: number;
  };
  variant?: "default" | "outline" | "secondary";
  label?: string;
};

const UF_OPTIONS = ["SP"] as const;
const MES_REF_OPTIONS = ["2026-05-01"] as const;

export function RegenerateBudgetButton({
  projectId,
  defaults,
  variant = "outline",
  label = "Regerar orçamento",
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const [uf, setUf] = useState(defaults?.uf ?? "SP");
  const [mesRef, setMesRef] = useState(defaults?.mes_referencia ?? "2026-05-01");
  const [desonerado, setDesonerado] = useState<"true" | "false">(
    defaults?.desonerado === false ? "false" : "true",
  );
  const [bdi, setBdi] = useState(defaults?.bdi_pct?.toString() ?? "28");

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
              <Select value={uf} onValueChange={(v) => v && setUf(v)} disabled={pending}>
                <SelectTrigger id="regen_uf">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {UF_OPTIONS.map((v) => (
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
              <Select value={mesRef} onValueChange={(v) => v && setMesRef(v)} disabled={pending}>
                <SelectTrigger id="regen_mes">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {MES_REF_OPTIONS.map((v) => (
                      <SelectItem key={v} value={v}>
                        {v.slice(0, 7)}
                      </SelectItem>
                    ))}
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
                  <SelectValue />
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
