"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { upgradePlanAction } from "@/server/actions/billing/upgrade-plan.action";
import { setOrgCpfCnpjAction } from "@/server/actions/organizations/set-cpf-cnpj.action";
import type { PlanId, BillingCycle } from "@/lib/plans/limits";

type Props = { targetPlan: PlanId; cycle?: BillingCycle };

export function PlanUpgradeButton({ targetPlan, cycle = "monthly" }: Props) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [askCpfCnpj, setAskCpfCnpj] = useState(false);
  const [cpfCnpj, setCpfCnpj] = useState("");
  const [submittingDoc, setSubmittingDoc] = useState(false);

  async function executeUpgrade() {
    setPending(true);
    try {
      const r = await upgradePlanAction({ target_plan: targetPlan, cycle });
      if (!r.ok) {
        if ("needs_cpf_cnpj" in r && r.needs_cpf_cnpj) {
          setAskCpfCnpj(true);
          return;
        }
        toast.error("error" in r ? r.error : "Não foi possível atualizar o plano.");
        return;
      }
      if (r.mode === "asaas") {
        // Abre em nova aba pra não perder o estado do app.
        // Nota: com noopener, alguns browsers retornam null mesmo abrindo —
        // por isso NÃO usamos fallback baseado em null check.
        const newWindow = window.open(r.checkout_url, "_blank", "noopener,noreferrer");
        if (newWindow && typeof newWindow.focus === "function") {
          // Conseguimos abrir com sucesso e temos referência.
          toast.success("Checkout aberto em nova aba. Conclua o pagamento por lá.");
        } else {
          // Sem referência: ou popup foi bloqueado, ou browser usa noopener-null.
          // Em ambos os casos, oferecemos link manual via toast.
          toast.info("Checkout pronto. Clique no link da notificação abaixo.", {
            action: {
              label: "Abrir checkout",
              onClick: () => window.open(r.checkout_url, "_blank"),
            },
            duration: 15_000,
          });
        }
        return;
      }
      toast.success(`Plano atualizado: ${r.new_plan.toUpperCase()}`);
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  async function saveCpfCnpjAndRetry() {
    setSubmittingDoc(true);
    try {
      const res = await setOrgCpfCnpjAction({ cpf_cnpj: cpfCnpj });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Documento salvo. Gerando cobrança…");
      setAskCpfCnpj(false);
      setCpfCnpj("");
      // Re-tenta o upgrade — agora a org já tem cpf_cnpj
      await executeUpgrade();
    } finally {
      setSubmittingDoc(false);
    }
  }

  return (
    <>
      <Button
        onClick={executeUpgrade}
        disabled={pending}
        size="sm"
        className="w-full"
        variant="default"
      >
        {pending
          ? "Aguarde…"
          : targetPlan === "free"
            ? "Voltar pro Free"
            : targetPlan === "agency"
              ? "Falar com a equipe"
              : "Escolher"}
      </Button>

      <Dialog open={askCpfCnpj} onOpenChange={setAskCpfCnpj}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Precisamos do seu CPF ou CNPJ</DialogTitle>
            <DialogDescription>
              O Asaas exige o documento do titular para gerar a cobrança (PIX/boleto). Você usa só
              uma vez — fica salvo no workspace.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="org_cpf_cnpj">CPF ou CNPJ</Label>
            <Input
              id="org_cpf_cnpj"
              value={cpfCnpj}
              onChange={(e) => setCpfCnpj(e.target.value)}
              placeholder="000.000.000-00 ou 00.000.000/0000-00"
              autoFocus
              disabled={submittingDoc}
              onKeyDown={(e) => {
                if (e.key === "Enter") void saveCpfCnpjAndRetry();
              }}
            />
            <p className="text-xs text-zinc-500">
              Pessoa física: CPF (11 dígitos). Pessoa jurídica: CNPJ (14 dígitos).
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAskCpfCnpj(false)} disabled={submittingDoc}>
              Cancelar
            </Button>
            <Button onClick={saveCpfCnpjAndRetry} disabled={submittingDoc || !cpfCnpj.trim()}>
              {submittingDoc ? "Salvando…" : "Salvar e continuar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
