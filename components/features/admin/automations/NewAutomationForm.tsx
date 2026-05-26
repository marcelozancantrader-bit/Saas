"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2 } from "lucide-react";
import { createAutomationAction } from "@/server/actions/admin/automations/create.action";
import type { TriggerCatalogEntry } from "@/lib/automations/catalog";
import type { TriggerType } from "@/lib/automations/types";

type Props = {
  triggersByCategory: Record<string, TriggerCatalogEntry[]>;
};

export function NewAutomationForm({ triggersByCategory }: Props) {
  const router = useRouter();
  const [selected, setSelected] = useState<TriggerType | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [pending, startTransition] = useTransition();

  function handleCreate() {
    if (!selected) {
      toast.error("Escolha um trigger.");
      return;
    }
    if (name.trim().length < 2) {
      toast.error("Nome muito curto.");
      return;
    }
    startTransition(async () => {
      const r = await createAutomationAction({
        name: name.trim(),
        description: description.trim(),
        trigger_type: selected,
      });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success("Automação criada — abra o editor pra adicionar ações.");
      router.push(`/admin/automacoes/${r.id}`);
    });
  }

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <h2 className="text-sm font-semibold tracking-wide text-zinc-700 uppercase dark:text-zinc-300">
          1. Escolha o trigger
        </h2>
        {Object.entries(triggersByCategory).map(([category, entries]) => (
          <div key={category} className="space-y-2">
            <p className="text-xs font-medium tracking-wider text-zinc-500 uppercase">{category}</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {entries.map((t) => {
                const isSelected = selected === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setSelected(t.id)}
                    className={`flex items-start gap-2 rounded-lg border p-3 text-left transition ${
                      isSelected
                        ? "border-blue-500 bg-blue-50 ring-2 ring-blue-200 dark:border-blue-500 dark:bg-blue-950/30 dark:ring-blue-900/40"
                        : "border-zinc-200 bg-white hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700"
                    }`}
                    aria-pressed={isSelected}
                  >
                    {isSelected ? (
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />
                    ) : (
                      <div className="mt-0.5 h-4 w-4 shrink-0 rounded-full border border-zinc-300 dark:border-zinc-700" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                        {t.label}
                      </p>
                      <p className="text-xs text-zinc-600 dark:text-zinc-400">{t.description}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <Card>
        <CardContent className="space-y-3 p-4">
          <h2 className="text-sm font-semibold tracking-wide text-zinc-700 uppercase dark:text-zinc-300">
            2. Nomeie a automação
          </h2>
          <div className="space-y-1.5">
            <Label htmlFor="auto-name">Nome</Label>
            <Input
              id="auto-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Notificar Slack a cada novo signup"
              maxLength={120}
              disabled={pending}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="auto-desc">Descrição (opcional)</Label>
            <Textarea
              id="auto-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              maxLength={500}
              placeholder="Notas pra você lembrar pra que serve."
              disabled={pending}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              onClick={handleCreate}
              disabled={pending || !selected || name.trim().length < 2}
            >
              {pending ? "Criando…" : "Criar e abrir editor"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
