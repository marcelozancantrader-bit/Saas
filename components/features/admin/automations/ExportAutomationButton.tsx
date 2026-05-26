"use client";

import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { toast } from "sonner";
import type { AdminAutomation } from "@/lib/automations/types";

/**
 * Botão Export — gera download de um JSON com a definição da automation.
 * O JSON pode ser importado em outra instância via /admin/automacoes/importar.
 */
export function ExportAutomationButton({ automation }: { automation: AdminAutomation }) {
  function handleExport() {
    const payload = {
      name: automation.name,
      description: automation.description,
      trigger: automation.trigger,
      graph: automation.graph,
      // Metadata pra rastreio (não precisa importar)
      _exported_at: new Date().toISOString(),
      _exported_from: "memorial-ai",
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const safeName = automation.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .slice(0, 60);
    a.download = `automation-${safeName}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("JSON da automação baixado.");
  }

  return (
    <Button variant="outline" size="sm" onClick={handleExport}>
      <Download className="mr-1.5 h-3.5 w-3.5" />
      Exportar
    </Button>
  );
}
