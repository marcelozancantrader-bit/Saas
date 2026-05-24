"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { startTrialAction } from "@/server/actions/billing/start-trial.action";

type Props = {
  label?: string;
  fullWidth?: boolean;
};

export function StartTrialButton({ label, fullWidth = false }: Props) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function onClick() {
    setPending(true);
    try {
      const res = await startTrialAction();
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Trial Pro ativado por 7 dias — sem cartão, sem pegadinha.");
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <Button onClick={onClick} disabled={pending} size="lg" className={fullWidth ? "w-full" : ""}>
      <Sparkles className="mr-2 h-4 w-4" aria-hidden />
      {pending ? "Ativando…" : (label ?? "Experimentar Pro grátis por 7 dias")}
    </Button>
  );
}
