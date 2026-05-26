import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getActionHandler, type ActionContext } from "./actions";
import type { AdminAutomation, AutomationGraph, RunStep } from "./types";

/**
 * Executa o grafo de uma automation node-a-node.
 *
 * Estratégia:
 *   1. Acha o node trigger (kind=trigger) — único por automation.
 *   2. BFS: para cada node, executa o handler; se if_condition, escolhe edge
 *      pelo sourceHandle ("true" | "false"); senão segue todos os outgoing edges.
 *   3. Captura output/error de cada step em RunStep[].
 *   4. Para se algum step falhar (status=failed → para a branch atual).
 *
 * O `step` do Inngest é opcional — quando ausente (test-run), wait_delay
 * usa setTimeout limitado a 5s.
 */

export type EngineContext = {
  admin: SupabaseClient;
  payload: Record<string, unknown>;
  step?: { sleep: (id: string, duration: string) => Promise<void> };
};

export type EngineResult = {
  status: "success" | "failed";
  steps: RunStep[];
};

export async function runAutomation(
  automation: AdminAutomation,
  ctx: EngineContext,
): Promise<EngineResult> {
  const graph = automation.graph;
  const steps: RunStep[] = [];

  const triggerNode = graph.nodes.find((n) => n.data.kind === "trigger");
  if (!triggerNode) {
    return {
      status: "failed",
      steps: [
        {
          node_id: "_root",
          action_type: "engine",
          status: "failed",
          error: "Automation sem trigger node",
          duration_ms: 0,
        },
      ],
    };
  }

  // BFS a partir do trigger
  const queue: string[] = [triggerNode.id];
  const visited = new Set<string>();
  let anyFailed = false;

  while (queue.length > 0) {
    const nodeId = queue.shift()!;
    if (visited.has(nodeId)) continue;
    visited.add(nodeId);

    const node = graph.nodes.find((n) => n.id === nodeId);
    if (!node) continue;

    // Trigger node não tem action — só serve pra começar o BFS.
    if (node.data.kind === "trigger") {
      const nextEdges = outgoingEdges(graph, nodeId);
      for (const e of nextEdges) queue.push(e.target);
      continue;
    }

    const handler = getActionHandler(node.data.actionType);
    if (!handler) {
      steps.push({
        node_id: nodeId,
        action_type: node.data.actionType,
        status: "failed",
        error: `Handler "${node.data.actionType}" não existe`,
        duration_ms: 0,
      });
      anyFailed = true;
      continue;
    }

    const startedAt = Date.now();
    const actionCtx: ActionContext = {
      admin: ctx.admin,
      payload: ctx.payload,
      ...(ctx.step ? { step: ctx.step } : {}),
    };
    let result;
    try {
      result = await handler(node.data.config, actionCtx);
    } catch (err) {
      result = {
        ok: false as const,
        error: err instanceof Error ? err.message : String(err),
      };
    }
    const duration_ms = Date.now() - startedAt;

    if (result.ok) {
      steps.push({
        node_id: nodeId,
        action_type: node.data.actionType,
        status: "success",
        output: result.output,
        duration_ms,
      });

      // Decide próximas arestas
      const outgoing = outgoingEdges(graph, nodeId);
      if (node.data.actionType === "if_condition" && result.branch) {
        // Segue só a edge cujo sourceHandle bate
        const branchEdges = outgoing.filter((e) => e.sourceHandle === result.branch);
        for (const e of branchEdges) queue.push(e.target);
      } else {
        for (const e of outgoing) queue.push(e.target);
      }
    } else {
      steps.push({
        node_id: nodeId,
        action_type: node.data.actionType,
        status: "failed",
        error: result.error,
        duration_ms,
      });
      anyFailed = true;
      // Não segue arestas — para a branch (mas BFS continua se houver outras
      // branches paralelas vindas de antes).
    }
  }

  return {
    status: anyFailed ? "failed" : "success",
    steps,
  };
}

function outgoingEdges(graph: AutomationGraph, sourceId: string) {
  return graph.edges.filter((e) => e.source === sourceId);
}
