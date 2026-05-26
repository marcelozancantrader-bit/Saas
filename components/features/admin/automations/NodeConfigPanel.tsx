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
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { X, Trash2 } from "lucide-react";
import { ACTION_CATALOG } from "@/lib/automations/catalog";
import {
  METRIC_CATALOG,
  METRICS_BY_CATEGORY,
  formatMetricValue,
} from "@/lib/automations/metrics-catalog";
import type { ActionType, TriggerType } from "@/lib/automations/types";

type Props = {
  node: Node;
  onUpdate: (config: Record<string, unknown>) => void;
  onRemove: () => void;
  onClose: () => void;
};

const NUMERIC_KEYS = new Set(["seconds", "max_iterations"]);
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

const METRIC_THRESHOLD_OPS: Array<{ value: string; label: string }> = [
  { value: "gt", label: "> (maior que)" },
  { value: "gte", label: "≥ (maior ou igual a)" },
  { value: "lt", label: "< (menor que)" },
  { value: "lte", label: "≤ (menor ou igual a)" },
  { value: "eq", label: "= (igual a)" },
];

export function NodeConfigPanel(props: Props) {
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
      <TriggerPanel
        triggerType={data.actionType as TriggerType}
        config={localConfig}
        setField={setField}
        onClose={onClose}
      />
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

function TriggerPanel({
  triggerType,
  config,
  setField,
  onClose,
}: {
  triggerType: TriggerType;
  config: Record<string, unknown>;
  setField: (key: string, value: unknown) => void;
  onClose: () => void;
}) {
  if (triggerType === "metric.threshold") {
    const metricId = typeof config.metric === "string" ? config.metric : "";
    const op = typeof config.op === "string" ? config.op : "gt";
    const threshold = typeof config.threshold === "number" ? config.threshold : 0;
    const cooldown = typeof config.cooldown_minutes === "number" ? config.cooldown_minutes : 60;
    const entry = metricId ? METRIC_CATALOG[metricId] : null;

    return (
      <aside className="w-80 shrink-0 overflow-y-auto border-l border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold tracking-wider text-zinc-500 uppercase">
            Trigger · Métrica
          </p>
          <button onClick={onClose} aria-label="Fechar painel">
            <X className="h-4 w-4 text-zinc-500" />
          </button>
        </div>
        <h3 className="mt-1 text-base font-semibold">Métrica passa um threshold</h3>
        <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
          Avaliada a cada 15 min pelo cron. Quando a condição é verdadeira, dispara com{" "}
          <code className="text-[10px]">cooldown</code> mínimo entre disparos.
        </p>

        <div className="mt-4 space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="metric-key" className="text-xs">
              Métrica
            </Label>
            <Select value={metricId} onValueChange={(v) => setField("metric", v)}>
              <SelectTrigger id="metric-key">
                <SelectValue placeholder="Escolha a métrica" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(METRICS_BY_CATEGORY).map(([cat, items]) => (
                  <SelectGroup key={cat}>
                    <SelectLabel>{cat}</SelectLabel>
                    {items.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                ))}
              </SelectContent>
            </Select>
            {entry ? <p className="text-[10px] text-zinc-500">{entry.description}</p> : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="metric-op" className="text-xs">
              Operador
            </Label>
            <Select value={op} onValueChange={(v) => setField("op", v)}>
              <SelectTrigger id="metric-op">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {METRIC_THRESHOLD_OPS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="metric-threshold" className="text-xs">
              Threshold ({entry?.unit ?? "valor"})
            </Label>
            <Input
              id="metric-threshold"
              type="number"
              step="any"
              value={Number.isFinite(threshold) ? String(threshold) : ""}
              onChange={(e) => setField("threshold", Number(e.target.value))}
            />
            {entry ? (
              <p className="text-[10px] text-zinc-500">
                Exemplo: {formatMetricValue(threshold || 0, entry.unit)}
              </p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="metric-cooldown" className="text-xs">
              Cooldown (minutos entre disparos)
            </Label>
            <Input
              id="metric-cooldown"
              type="number"
              min={0}
              max={1440}
              value={String(cooldown)}
              onChange={(e) => setField("cooldown_minutes", Number(e.target.value))}
            />
            <p className="text-[10px] text-zinc-500">
              0 = dispara em toda checagem. Default 60 evita 96 alertas/dia.
            </p>
          </div>
        </div>
      </aside>
    );
  }

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
        Não há configuração adicional pra este tipo — conecte uma action à direita pra começar a
        fluxar.
      </p>
    </aside>
  );
}
