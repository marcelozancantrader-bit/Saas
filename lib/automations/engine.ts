import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getActionHandler, type ActionContext } from "./actions";
import { forEachConfigSchema } from "./types";
import type { AdminAutomation, AutomationGraph, RunStep } from "./types";

/**
 * Executa o grafo de uma automation node-a-node.
 *
 * Estratégia:
 *   1. Acha o node trigger (kind=trigger) — único por automation.
 *   2. BFS: para cada node, executa o handler; se if_condition, escolhe edge
 *      pelo sourceHandle ("true" | "false"); senão segue todos os outgoing edges.
 *   3. for_each: rodar um sub-BFS sobre o subgrafo reachable pelo handle "loop",
 *      uma vez por item (cap em max_iterations). Continua via handle "done"
 *      depois das iterações.
 *   4. Captura output/error de cada step em RunStep[]. Steps dentro de loops
 *      ganham sufixo `[iter:i]` no node_id pra distinguir iterações.
 *   5. Para se algum step falhar (status=failed → para a branch atual).
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

  const failed = await runSubGraph({
    graph,
    startIds: outgoingEdges(graph, triggerNode.id).map((e) => e.target),
    stepOutputs: {},
    lastStepOutput: undefined,
    actionBase: { admin: ctx.admin, payload: ctx.payload, ...(ctx.step ? { step: ctx.step } : {}) },
    steps,
    excludeFromVisit: new Set(),
    nodeIdPrefix: "",
  });

  return { status: failed ? "failed" : "success", steps };
}

type SubGraphArgs = {
  graph: AutomationGraph;
  startIds: string[];
  stepOutputs: Record<string, unknown>;
  lastStepOutput: unknown;
  actionBase: Omit<ActionContext, "steps" | "lastStep" | "item" | "index">;
  steps: RunStep[];
  /** Nodes que NÃO devem ser visitados pelo sub-BFS (escopo do loop). */
  excludeFromVisit: Set<string>;
  /** Sufixo pra node_id em steps — usado pra distinguir iterações em loops. */
  nodeIdPrefix: string;
  /** Sugar pra loop body: contexto extra. */
  loopCtx?: { item: unknown; index: number };
};

/**
 * BFS interno — roda um subgrafo a partir de `startIds`. Retorna `true` se
 * qualquer step falhou.
 */
async function runSubGraph(args: SubGraphArgs): Promise<boolean> {
  const {
    graph,
    startIds,
    stepOutputs,
    actionBase,
    steps,
    excludeFromVisit,
    nodeIdPrefix,
    loopCtx,
  } = args;
  let lastStepOutput = args.lastStepOutput;

  const queue: string[] = [...startIds];
  const visited = new Set<string>();
  let anyFailed = false;

  while (queue.length > 0) {
    const nodeId = queue.shift()!;
    if (visited.has(nodeId) || excludeFromVisit.has(nodeId)) continue;
    visited.add(nodeId);

    const node = graph.nodes.find((n) => n.id === nodeId);
    if (!node) continue;

    // Trigger não acontece dentro de subgraph (mas defesa)
    if (node.data.kind === "trigger") {
      const nextEdges = outgoingEdges(graph, nodeId);
      for (const e of nextEdges) queue.push(e.target);
      continue;
    }

    const stepNodeId = nodeIdPrefix ? `${nodeIdPrefix}${nodeId}` : nodeId;

    // === for_each: tratamento especial (não passa por handlers) ===
    if (node.data.actionType === "for_each") {
      const loopResult = await runForEach({
        graph,
        node,
        nodeId,
        stepNodeId,
        stepOutputs,
        lastStepOutput,
        actionBase,
        steps,
      });
      if (loopResult.failed) anyFailed = true;
      lastStepOutput = loopResult.output;
      stepOutputs[nodeId] = loopResult.output;

      // Marca todos os nodes do loop body como visited no escopo atual
      for (const id of loopResult.bodyNodeIds) visited.add(id);

      // Continua via handle "done"
      const doneEdges = outgoingEdges(graph, nodeId).filter((e) => e.sourceHandle === "done");
      for (const e of doneEdges) queue.push(e.target);
      continue;
    }

    const handler = getActionHandler(node.data.actionType);
    if (!handler) {
      steps.push({
        node_id: stepNodeId,
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
      ...actionBase,
      steps: stepOutputs,
      lastStep: lastStepOutput,
      ...(loopCtx ? { item: loopCtx.item, index: loopCtx.index } : {}),
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
        node_id: stepNodeId,
        action_type: node.data.actionType,
        status: "success",
        output: result.output,
        duration_ms,
      });

      stepOutputs[nodeId] = result.output;
      lastStepOutput = result.output;

      const outgoing = outgoingEdges(graph, nodeId);
      if (node.data.actionType === "if_condition" && result.branch) {
        const branchEdges = outgoing.filter((e) => e.sourceHandle === result.branch);
        for (const e of branchEdges) queue.push(e.target);
      } else {
        for (const e of outgoing) queue.push(e.target);
      }
    } else {
      steps.push({
        node_id: stepNodeId,
        action_type: node.data.actionType,
        status: "failed",
        error: result.error,
        duration_ms,
      });
      anyFailed = true;
    }
  }

  return anyFailed;
}

async function runForEach(args: {
  graph: AutomationGraph;
  node: AutomationGraph["nodes"][number];
  nodeId: string;
  stepNodeId: string;
  stepOutputs: Record<string, unknown>;
  lastStepOutput: unknown;
  actionBase: Omit<ActionContext, "steps" | "lastStep" | "item" | "index">;
  steps: RunStep[];
}): Promise<{
  failed: boolean;
  output: { items_count: number; iterations: number };
  bodyNodeIds: Set<string>;
}> {
  const { graph, node, nodeId, stepNodeId, stepOutputs, lastStepOutput, actionBase, steps } = args;

  // Body subgraph
  const loopEdges = outgoingEdges(graph, nodeId).filter((e) => e.sourceHandle === "loop");
  const bodyNodeIds = collectReachable(
    graph,
    loopEdges.map((e) => e.target),
    new Set([
      nodeId,
      ...outgoingEdges(graph, nodeId)
        .filter((e) => e.sourceHandle === "done")
        .map((e) => e.target),
    ]),
  );

  // Resolve config
  const parsed = forEachConfigSchema.safeParse(node.data.config);
  if (!parsed.success) {
    steps.push({
      node_id: stepNodeId,
      action_type: "for_each",
      status: "failed",
      error: `config inválida: ${parsed.error.issues[0]?.message ?? "?"}`,
      duration_ms: 0,
    });
    return { failed: true, output: { items_count: 0, iterations: 0 }, bodyNodeIds };
  }
  const { items_path, max_iterations } = parsed.data;

  // Resolve items via ActionContext (mesmo template resolver)
  const tempCtx: ActionContext = {
    ...actionBase,
    steps: stepOutputs,
    lastStep: lastStepOutput,
  };
  const items = resolveItemsPath(items_path, tempCtx);

  if (!Array.isArray(items)) {
    steps.push({
      node_id: stepNodeId,
      action_type: "for_each",
      status: "failed",
      error: `items_path "${items_path}" não resolve pra array (recebido ${typeof items})`,
      duration_ms: 0,
    });
    return { failed: true, output: { items_count: 0, iterations: 0 }, bodyNodeIds };
  }

  const limited = items.slice(0, max_iterations);
  const startedAt = Date.now();
  let anyFailed = false;

  for (let i = 0; i < limited.length; i++) {
    // Sub-BFS pra esta iteração — escopo isolado de visited
    const iterFailed = await runSubGraph({
      graph,
      startIds: loopEdges.map((e) => e.target),
      stepOutputs,
      lastStepOutput,
      actionBase,
      steps,
      excludeFromVisit: new Set([nodeId]),
      nodeIdPrefix: `${stepNodeId}[${i}].`,
      loopCtx: { item: limited[i], index: i },
    });
    if (iterFailed) anyFailed = true;
  }

  steps.push({
    node_id: stepNodeId,
    action_type: "for_each",
    status: anyFailed ? "failed" : "success",
    output: {
      items_count: items.length,
      iterations: limited.length,
      capped: items.length > max_iterations,
    },
    duration_ms: Date.now() - startedAt,
  });

  return {
    failed: anyFailed,
    output: { items_count: items.length, iterations: limited.length },
    bodyNodeIds,
  };
}

/**
 * Coleta os IDs reachable a partir de `startIds`, parando antes de entrar em
 * `stop`. Usado pra descobrir os nodes que pertencem ao body de um loop sem
 * incluir nodes da branch "done".
 */
function collectReachable(
  graph: AutomationGraph,
  startIds: string[],
  stop: Set<string>,
): Set<string> {
  const seen = new Set<string>();
  const q = [...startIds];
  while (q.length > 0) {
    const id = q.shift()!;
    if (seen.has(id) || stop.has(id)) continue;
    seen.add(id);
    for (const e of outgoingEdges(graph, id)) {
      q.push(e.target);
    }
  }
  return seen;
}

function resolveItemsPath(path: string, ctx: ActionContext): unknown {
  // path: "payload.foo" | "lastStep.bar" | "steps.<id>.x"
  const parts = path.split(".");
  if (parts[0] === "payload") {
    return walk(ctx.payload, parts.slice(1));
  }
  if (parts[0] === "lastStep") {
    return walk(ctx.lastStep, parts.slice(1));
  }
  if (parts[0] === "steps") {
    return walk(ctx.steps ?? {}, parts.slice(1));
  }
  // fallback: payload direto
  return walk(ctx.payload, parts);
}

function walk(obj: unknown, parts: string[]): unknown {
  if (parts.length === 0) return obj;
  let cur: unknown = obj;
  for (const p of parts) {
    if (cur === null || cur === undefined || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[p];
  }
  return cur;
}

function outgoingEdges(graph: AutomationGraph, sourceId: string) {
  return graph.edges.filter((e) => e.source === sourceId);
}
