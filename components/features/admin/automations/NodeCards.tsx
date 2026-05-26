"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Zap, Cog, GitBranch } from "lucide-react";
import { ACTION_CATALOG, TRIGGER_CATALOG } from "@/lib/automations/catalog";
import type { ActionType, TriggerType } from "@/lib/automations/types";

type NodeData = {
  kind: "trigger" | "action" | "condition";
  actionType: string;
  label?: string;
  config: Record<string, unknown>;
};

export function TriggerNode(props: NodeProps) {
  const data = props.data as NodeData;
  const entry = TRIGGER_CATALOG[data.actionType as TriggerType];
  return (
    <div className="min-w-[180px] rounded-md border-2 border-violet-400 bg-violet-50 px-3 py-2 shadow-sm dark:border-violet-500 dark:bg-violet-950/50">
      <div className="flex items-center gap-1.5">
        <Zap className="h-3.5 w-3.5 text-violet-700 dark:text-violet-300" />
        <p className="text-[10px] font-semibold tracking-wider text-violet-700 uppercase dark:text-violet-300">
          Trigger
        </p>
      </div>
      <p className="mt-1 text-sm font-medium text-zinc-900 dark:text-zinc-100">
        {entry?.label ?? data.actionType}
      </p>
      <Handle type="source" position={Position.Right} className="!h-2 !w-2 !bg-violet-500" />
    </div>
  );
}

export function ActionNode(props: NodeProps) {
  const data = props.data as NodeData;
  const entry = ACTION_CATALOG[data.actionType as ActionType];
  return (
    <div className="min-w-[180px] rounded-md border-2 border-blue-400 bg-blue-50 px-3 py-2 shadow-sm dark:border-blue-500 dark:bg-blue-950/50">
      <Handle type="target" position={Position.Left} className="!h-2 !w-2 !bg-blue-500" />
      <div className="flex items-center gap-1.5">
        <Cog className="h-3.5 w-3.5 text-blue-700 dark:text-blue-300" />
        <p className="text-[10px] font-semibold tracking-wider text-blue-700 uppercase dark:text-blue-300">
          Action
        </p>
      </div>
      <p className="mt-1 text-sm font-medium text-zinc-900 dark:text-zinc-100">
        {entry?.label ?? data.actionType}
      </p>
      <Handle type="source" position={Position.Right} className="!h-2 !w-2 !bg-blue-500" />
    </div>
  );
}

export function ConditionNode(props: NodeProps) {
  const data = props.data as NodeData;
  return (
    <div className="min-w-[200px] rounded-md border-2 border-amber-400 bg-amber-50 px-3 py-2 shadow-sm dark:border-amber-500 dark:bg-amber-950/50">
      <Handle type="target" position={Position.Left} className="!h-2 !w-2 !bg-amber-500" />
      <div className="flex items-center gap-1.5">
        <GitBranch className="h-3.5 w-3.5 text-amber-700 dark:text-amber-300" />
        <p className="text-[10px] font-semibold tracking-wider text-amber-700 uppercase dark:text-amber-300">
          Condition
        </p>
      </div>
      <p className="mt-1 text-sm font-medium text-zinc-900 dark:text-zinc-100">Se / Senão</p>
      <p className="mt-0.5 text-[10px] text-zinc-600 dark:text-zinc-400">
        {String(data.config.path ?? "")} {String(data.config.op ?? "")}{" "}
        <code>{String(data.config.value ?? "")}</code>
      </p>
      <Handle
        type="source"
        position={Position.Right}
        id="true"
        className="!h-2 !w-2 !bg-emerald-500"
        style={{ top: "60%" }}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="false"
        className="!h-2 !w-2 !bg-rose-500"
        style={{ top: "85%" }}
      />
    </div>
  );
}
