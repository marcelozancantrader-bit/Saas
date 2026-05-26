"use client";

import { useState } from "react";
import type { Node } from "@xyflow/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { X, Trash2 } from "lucide-react";
import { ACTION_CATALOG } from "@/lib/automations/catalog";
import type { ActionType } from "@/lib/automations/types";

type Props = {
  node: Node;
  onUpdate: (config: Record<string, unknown>) => void;
  onRemove: () => void;
  onClose: () => void;
};

const NUMERIC_KEYS = new Set(["seconds"]);
const TEXTAREA_KEYS = new Set(["body", "body_template", "text"]);
const OP_KEYS = new Set(["op"]);

const OP_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "eq", label: "= (igual)" },
  { value: "ne", label: "≠ (diferente)" },
  { value: "gt", label: "> (maior)" },
  { value: "gte", label: "≥ (maior ou igual)" },
  { value: "lt", label: "< (menor)" },
  { value: "lte", label: "≤ (menor ou igual)" },
  { value: "contains", label: "contém" },
];

export function NodeConfigPanel(props: Props) {
  // key reseta state quando node muda (sem useEffect com setState)
  return <PanelInner key={props.node.id} {...props} />;
}

function PanelInner({ node, onUpdate, onRemove, onClose }: Props) {
  const data = node.data as {
    kind: string;
    actionType: string;
    label?: string;
    config: Record<string, unknown>;
  };
  const isTrigger = data.kind === "trigger";
  const entry = !isTrigger ? ACTION_CATALOG[data.actionType as ActionType] : null;

  const [localConfig, setLocalConfig] = useState<Record<string, unknown>>(data.config ?? {});

  function setField(key: string, value: unknown) {
    const next = { ...localConfig, [key]: value };
    setLocalConfig(next);
    onUpdate(next);
  }

  if (isTrigger) {
    return (
      <aside className="w-80 shrink-0 overflow-y-auto border-l border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold tracking-wider text-zinc-500 uppercase">Trigger</p>
          <button onClick={onClose} aria-label="Fechar painel">
            <X className="h-4 w-4 text-zinc-500" />
          </button>
        </div>
        <p className="mt-2 text-sm">Esse é o ponto de entrada da automação.</p>
        <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
          Não há configuração adicional por enquanto — conecte uma action à direita pra começar a
          fluxar.
        </p>
      </aside>
    );
  }

  if (!entry) return null;

  return (
    <aside className="w-80 shrink-0 overflow-y-auto border-l border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold tracking-wider text-zinc-500 uppercase">
          {entry.category}
        </p>
        <button onClick={onClose} aria-label="Fechar painel">
          <X className="h-4 w-4 text-zinc-500" />
        </button>
      </div>
      <h3 className="mt-1 text-base font-semibold">{entry.label}</h3>
      <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">{entry.description}</p>

      <div className="mt-4 space-y-3">
        {Object.entries(entry.configPlaceholder).map(([key, placeholder]) => {
          const value = localConfig[key] ?? "";
          const id = `cfg-${node.id}-${key}`;
          if (OP_KEYS.has(key)) {
            return (
              <div key={key} className="space-y-1.5">
                <Label htmlFor={id} className="text-xs capitalize">
                  {key}
                </Label>
                <Select value={String(value)} onValueChange={(v) => setField(key, v)}>
                  <SelectTrigger id={id}>
                    <SelectValue placeholder="Operador" />
                  </SelectTrigger>
                  <SelectContent>
                    {OP_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            );
          }
          if (TEXTAREA_KEYS.has(key)) {
            return (
              <div key={key} className="space-y-1.5">
                <Label htmlFor={id} className="text-xs capitalize">
                  {key.replace(/_/g, " ")}
                </Label>
                <Textarea
                  id={id}
                  value={String(value)}
                  onChange={(e) => setField(key, e.target.value)}
                  placeholder={placeholder}
                  rows={4}
                  className="font-mono text-xs"
                />
              </div>
            );
          }
          if (NUMERIC_KEYS.has(key)) {
            return (
              <div key={key} className="space-y-1.5">
                <Label htmlFor={id} className="text-xs capitalize">
                  {key}
                </Label>
                <Input
                  id={id}
                  type="number"
                  value={String(value)}
                  onChange={(e) => setField(key, Number(e.target.value))}
                  placeholder={placeholder}
                />
              </div>
            );
          }
          return (
            <div key={key} className="space-y-1.5">
              <Label htmlFor={id} className="text-xs capitalize">
                {key.replace(/_/g, " ")}
              </Label>
              <Input
                id={id}
                value={String(value)}
                onChange={(e) => setField(key, e.target.value)}
                placeholder={placeholder}
              />
            </div>
          );
        })}
      </div>

      <div className="mt-6 border-t border-zinc-200 pt-3 dark:border-zinc-800">
        <Button
          variant="outline"
          size="sm"
          onClick={onRemove}
          className="w-full text-rose-700 dark:text-rose-400"
        >
          <Trash2 className="mr-1.5 h-3.5 w-3.5" />
          Remover nó
        </Button>
      </div>
    </aside>
  );
}
