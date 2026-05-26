"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { toggleAutomationAction } from "@/server/actions/admin/automations/toggle.action";

type Props = { id: string; enabled: boolean };

export function AutomationToggle({ id, enabled: initial }: Props) {
  const [enabled, setEnabled] = useState(initial);
  const [pending, startTransition] = useTransition();

  function handleToggle() {
    const next = !enabled;
    startTransition(async () => {
      const r = await toggleAutomationAction({ id, enabled: next });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      setEnabled(next);
      toast.success(next ? "Automação ativada" : "Automação pausada");
    });
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      disabled={pending}
      onClick={handleToggle}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors disabled:opacity-50 ${
        enabled ? "bg-emerald-600 dark:bg-emerald-500" : "bg-zinc-300 dark:bg-zinc-700"
      }`}
    >
      <span
        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
          enabled ? "translate-x-5" : "translate-x-1"
        }`}
      />
    </button>
  );
}
