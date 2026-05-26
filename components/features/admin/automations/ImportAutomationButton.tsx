"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";
import { importAutomationAction } from "@/server/actions/admin/automations/import.action";

export function ImportAutomationButton() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [reading, setReading] = useState(false);

  function handlePick() {
    fileInputRef.current?.click();
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 200_000) {
      toast.error("Arquivo muito grande (máx 200KB).");
      return;
    }
    setReading(true);
    const reader = new FileReader();
    reader.onload = () => {
      setReading(false);
      const text = String(reader.result ?? "");
      if (!text) {
        toast.error("Arquivo vazio.");
        return;
      }
      startTransition(async () => {
        const r = await importAutomationAction({ payload: text });
        if (!r.ok) {
          toast.error(r.error);
          return;
        }
        toast.success("Automação importada — pausada por padrão.");
        router.push(`/admin/automacoes/${r.id}`);
      });
    };
    reader.onerror = () => {
      setReading(false);
      toast.error("Erro ao ler arquivo.");
    };
    reader.readAsText(file);
    // Reset pra permitir importar o mesmo arquivo de novo
    e.target.value = "";
  }

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={handleFile}
      />
      <Button variant="outline" size="sm" onClick={handlePick} disabled={pending || reading}>
        <Upload className="mr-1.5 h-3.5 w-3.5" />
        {pending || reading ? "Importando…" : "Importar JSON"}
      </Button>
    </>
  );
}
