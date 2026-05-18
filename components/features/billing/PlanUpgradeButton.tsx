"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { upgradePlanAction } from "@/server/actions/billing/upgrade-plan.action";
import type { PlanId } from "@/lib/plans/limits";

type Props = { targetPlan: PlanId };

export function PlanUpgradeButton({ targetPlan }: Props) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function go() {
    setPending(true);
    try {
      const r = await upgradePlanAction({ target_plan: targetPlan });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      if (r.mode === "asaas") {
        toast.success("Redirecionando para o checkout Asaas…");
        window.location.href = r.checkout_url;
        return;
      }
      toast.success(`Plano atualizado: ${r.new_plan.toUpperCase()}`);
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <Button onClick={go} disabled={pending} size="sm" className="w-full" variant="default">
      {pending
        ? "Aguarde…"
        : targetPlan === "agency"
          ? "Falar com a equipe"
          : "Mudar para este plano"}
    </Button>
  );
}
