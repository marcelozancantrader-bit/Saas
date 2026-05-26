"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type Connection,
  type NodeTypes,
  Position,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Play } from "lucide-react";
import { ACTION_CATALOG, TRIGGER_CATALOG, ACTIONS_BY_CATEGORY } from "@/lib/automations/catalog";
import { updateAutomationAction } from "@/server/actions/admin/automations/update.action";
import type { AdminAutomation, AutomationGraph } from "@/lib/automations/types";
import { TriggerNode, ActionNode, ConditionNode } from "./NodeCards";
import { NodeConfigPanel } from "./NodeConfigPanel";
import { TestRunDialog } from "./TestRunDialog";

const nodeTypes: NodeTypes = {
  trigger: TriggerNode,
  action: ActionNode,
  condition: ConditionNode,
};

export function AutomationEditor({ automation }: { automation: AdminAutomation }) {
  return (
    <ReactFlowProvider>
      <EditorInner automation={automation} />
    </ReactFlowProvider>
  );
}

function EditorInner({ automation }: { automation: AdminAutomation }) {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>(
    automation.graph.nodes.map((n) => ({
      id: n.id,
      type: n.type,
      position: n.position,
      data: n.data,
    })) as Node[],
  );
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(
    automation.graph.edges.map((e) => {
      const edge: Edge = { id: e.id, source: e.source, target: e.target };
      if (e.sourceHandle) edge.sourceHandle = e.sourceHandle;
      if (e.targetHandle) edge.targetHandle = e.targetHandle;
      return edge;
    }),
  );
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [testDialogOpen, setTestDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-save com debounce
  const persist = useCallback(
    (currentNodes: Node[], currentEdges: Edge[]) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(async () => {
        setSaving(true);
        const graph: AutomationGraph = {
          nodes: currentNodes.map((n) => ({
            id: n.id,
            type: n.type ?? "action",
            position: n.position,
            data: n.data as AutomationGraph["nodes"][number]["data"],
          })),
          edges: currentEdges.map((e) => ({
            id: e.id,
            source: e.source,
            target: e.target,
            ...(e.sourceHandle ? { sourceHandle: e.sourceHandle } : {}),
            ...(e.targetHandle ? { targetHandle: e.targetHandle } : {}),
          })),
        };
        const r = await updateAutomationAction({ id: automation.id, graph });
        setSaving(false);
        if (!r.ok) toast.error(`Falha ao salvar: ${r.error}`);
      }, 1000);
    },
    [automation.id],
  );

  useEffect(() => {
    persist(nodes, edges);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [nodes, edges, persist]);

  const onConnect = useCallback(
    (conn: Connection) => {
      setEdges((eds) => addEdge(conn, eds));
    },
    [setEdges],
  );

  const addNode = useCallback(
    (actionType: string) => {
      const isCondition = actionType === "if_condition";
      const entry = ACTION_CATALOG[actionType as keyof typeof ACTION_CATALOG];
      const id = `${actionType}-${crypto.randomUUID().slice(0, 8)}`;
      const newNode: Node = {
        id,
        type: isCondition ? "condition" : "action",
        position: { x: 320, y: 80 + nodes.length * 110 },
        data: {
          kind: isCondition ? "condition" : "action",
          actionType,
          label: entry?.label ?? actionType,
          config: { ...entry.configPlaceholder } as Record<string, unknown>,
        },
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
      };
      setNodes((nds) => [...nds, newNode]);
    },
    [nodes.length, setNodes],
  );

  function updateNodeConfig(nodeId: string, config: Record<string, unknown>) {
    setNodes((nds) =>
      nds.map((n) =>
        n.id === nodeId
          ? {
              ...n,
              data: {
                ...(n.data as { kind: string; actionType: string; label?: string }),
                config,
              },
            }
          : n,
      ),
    );
  }

  function removeNode(nodeId: string) {
    setNodes((nds) => nds.filter((n) => n.id !== nodeId));
    setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
    if (selectedNodeId === nodeId) setSelectedNodeId(null);
  }

  const selectedNode = useMemo(
    () => (selectedNodeId ? nodes.find((n) => n.id === selectedNodeId) : null) ?? null,
    [selectedNodeId, nodes],
  );

  const triggerType = automation.trigger.type;
  const triggerEntry = TRIGGER_CATALOG[triggerType];

  return (
    <div className="flex h-full">
      {/* Palette */}
      <aside className="w-56 shrink-0 overflow-y-auto border-r border-zinc-200 bg-zinc-50/50 p-3 dark:border-zinc-800 dark:bg-zinc-900/50">
        <div className="space-y-1">
          <p className="text-[10px] font-semibold tracking-wider text-zinc-500 uppercase">
            Trigger ativo
          </p>
          <div className="rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-xs dark:border-zinc-800 dark:bg-zinc-900">
            <p className="font-medium">{triggerEntry?.label ?? triggerType}</p>
            <p className="mt-0.5 text-[10px] text-zinc-500">Payload exemplo expandido abaixo</p>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          {Object.entries(ACTIONS_BY_CATEGORY).map(([category, entries]) => (
            <div key={category} className="space-y-1">
              <p className="text-[10px] font-semibold tracking-wider text-zinc-500 uppercase">
                {category}
              </p>
              <div className="space-y-1">
                {entries.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => addNode(a.id)}
                    className="w-full rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-left text-xs transition hover:border-blue-400 hover:bg-blue-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-blue-500 dark:hover:bg-blue-950/30"
                  >
                    <p className="font-medium">{a.label}</p>
                    <p className="mt-0.5 text-[10px] text-zinc-500">{a.description}</p>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 space-y-1">
          <p className="text-[10px] font-semibold tracking-wider text-zinc-500 uppercase">
            Payload exemplo
          </p>
          <pre className="overflow-x-auto rounded-md border border-zinc-200 bg-zinc-50 p-2 text-[10px] dark:border-zinc-800 dark:bg-zinc-950">
            {JSON.stringify(triggerEntry?.examplePayload ?? {}, null, 2)}
          </pre>
          <p className="text-[10px] text-zinc-500">
            Use <code className="text-[10px]">{"{{payload.x.y}}"}</code> nos campos.
          </p>
        </div>
      </aside>

      {/* Canvas */}
      <div className="relative flex-1">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={(_, n) => setSelectedNodeId(n.id)}
          onPaneClick={() => setSelectedNodeId(null)}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.3 }}
        >
          <Background gap={16} color="#e4e4e7" />
          <Controls position="bottom-left" />
          <MiniMap pannable zoomable position="bottom-right" />
        </ReactFlow>

        <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
          <span className="text-[11px] text-zinc-500">{saving ? "Salvando…" : "Salvo"}</span>
          <Button size="sm" onClick={() => setTestDialogOpen(true)}>
            <Play className="mr-1.5 h-3.5 w-3.5" />
            Testar
          </Button>
        </div>
      </div>

      {/* Config panel */}
      {selectedNode ? (
        <NodeConfigPanel
          node={selectedNode}
          onUpdate={(config) => updateNodeConfig(selectedNode.id, config)}
          onRemove={() => removeNode(selectedNode.id)}
          onClose={() => setSelectedNodeId(null)}
        />
      ) : null}

      <TestRunDialog
        open={testDialogOpen}
        onClose={() => setTestDialogOpen(false)}
        automationId={automation.id}
        examplePayload={triggerEntry?.examplePayload ?? {}}
      />
    </div>
  );
}
