"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, Sparkles, Zap } from "lucide-react";
import { createAutomationAction } from "@/server/actions/admin/automations/create.action";
import type { TriggerCatalogEntry } from "@/lib/automations/catalog";
import type { Recipe } from "@/lib/automations/recipes";
import type { TriggerType } from "@/lib/automations/types";

type Props = {
  triggersByCategory: Record<string, TriggerCatalogEntry[]>;
  recipesByCategory: Record<string, Recipe[]>;
};

type Mode = "recipe" | "scratch";

export function NewAutomationForm({ triggersByCategory, recipesByCategory }: Props) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("recipe");
  const [selectedTrigger, setSelectedTrigger] = useState<TriggerType | null>(null);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [pending, startTransition] = useTransition();

  function pickRecipe(r: Recipe) {
    setSelectedRecipe(r);
    setSelectedTrigger(null);
    if (!name) setName(r.name);
  }

  function pickTrigger(t: TriggerType) {
    setSelectedTrigger(t);
    setSelectedRecipe(null);
  }

  function handleCreate() {
    if (mode === "recipe" && !selectedRecipe) {
      toast.error("Escolha uma receita.");
      return;
    }
    if (mode === "scratch" && !selectedTrigger) {
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
        ...(mode === "recipe"
          ? { recipe_id: selectedRecipe!.id }
          : { trigger_type: selectedTrigger! }),
      });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success(
        mode === "recipe"
          ? "Automação criada da receita — revise no editor."
          : "Automação criada — abra o editor pra adicionar ações.",
      );
      router.push(`/admin/automacoes/${r.id}`);
    });
  }

  const canSubmit =
    (mode === "recipe" ? !!selectedRecipe : !!selectedTrigger) && name.trim().length >= 2;

  return (
    <div className="space-y-6">
      {/* Mode tabs */}
      <div className="flex gap-2 border-b border-zinc-200 dark:border-zinc-800">
        <button
          type="button"
          onClick={() => setMode("recipe")}
          className={`flex items-center gap-1.5 border-b-2 px-4 py-2 text-sm font-medium transition ${
            mode === "recipe"
              ? "border-blue-600 text-blue-700 dark:border-blue-400 dark:text-blue-300"
              : "border-transparent text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
          }`}
        >
          <Sparkles className="h-3.5 w-3.5" />
          Usar receita pronta
        </button>
        <button
          type="button"
          onClick={() => setMode("scratch")}
          className={`flex items-center gap-1.5 border-b-2 px-4 py-2 text-sm font-medium transition ${
            mode === "scratch"
              ? "border-blue-600 text-blue-700 dark:border-blue-400 dark:text-blue-300"
              : "border-transparent text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
          }`}
        >
          <Zap className="h-3.5 w-3.5" />
          Começar do zero
        </button>
      </div>

      {mode === "recipe" ? (
        <div className="space-y-4">
          {Object.entries(recipesByCategory).map(([category, recipes]) => (
            <div key={category} className="space-y-2">
              <p className="text-xs font-medium tracking-wider text-zinc-500 uppercase">
                {category}
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                {recipes.map((r) => {
                  const isSelected = selectedRecipe?.id === r.id;
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => pickRecipe(r)}
                      className={`flex items-start gap-3 rounded-lg border p-3 text-left transition ${
                        isSelected
                          ? "border-blue-500 bg-blue-50 ring-2 ring-blue-200 dark:border-blue-500 dark:bg-blue-950/30 dark:ring-blue-900/40"
                          : "border-zinc-200 bg-white hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700"
                      }`}
                      aria-pressed={isSelected}
                    >
                      <span className="text-2xl leading-none">{r.icon}</span>
                      <div className="min-w-0 flex-1">
                        <p className="flex items-center gap-1.5 text-sm font-medium text-zinc-900 dark:text-zinc-100">
                          {r.name}
                          {isSelected ? (
                            <CheckCircle2 className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                          ) : null}
                        </p>
                        <p className="mt-0.5 text-xs text-zinc-600 dark:text-zinc-400">
                          {r.description}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(triggersByCategory).map(([category, entries]) => (
            <div key={category} className="space-y-2">
              <p className="text-xs font-medium tracking-wider text-zinc-500 uppercase">
                {category}
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                {entries.map((t) => {
                  const isSelected = selectedTrigger === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => pickTrigger(t.id)}
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
      )}

      <Card>
        <CardContent className="space-y-3 p-4">
          <h2 className="text-sm font-semibold tracking-wide text-zinc-700 uppercase dark:text-zinc-300">
            Nomeie a automação
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
            <Button onClick={handleCreate} disabled={pending || !canSubmit}>
              {pending ? "Criando…" : "Criar e abrir editor"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
