import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AutomationGraph, Trigger } from "@/lib/automations/types";

export type AutomationSnapshot = {
  name: string;
  description: string | null;
  trigger: Trigger;
  graph: AutomationGraph;
};

export type AutomationVersionRow = {
  id: string;
  automation_id: string;
  version_number: number;
  name: string;
  description: string | null;
  trigger: Trigger;
  graph: AutomationGraph;
  change_summary: string | null;
  created_by: string | null;
  created_at: string;
};

/**
 * Snapshot uma versão se previous ≠ next.
 *
 * Coalesce: se a versão mais recente tem mesmo created_by E foi criada nos
 * últimos 5 minutos, atualiza o snapshot existente em vez de criar um novo.
 * Isso evita poluir o histórico com 60 versões durante uma sessão contínua
 * de edição (auto-save dispara a cada 1s).
 */
export async function snapshotAutomationVersion(args: {
  admin: SupabaseClient;
  automationId: string;
  createdBy: string | null;
  previous: AutomationSnapshot;
  next: AutomationSnapshot;
}): Promise<{ created: boolean; versionNumber: number | null }> {
  const { admin, automationId, createdBy, previous, next } = args;

  if (!hasMaterialChange(previous, next)) {
    return { created: false, versionNumber: null };
  }

  const summary = summarizeDiff(previous, next);

  // Busca versão mais recente pra decidir entre INSERT ou UPDATE (coalesce)
  const { data: latest, error: latestErr } = await admin
    .from("admin_automation_versions")
    .select("id, version_number, created_by, created_at")
    .eq("automation_id", automationId)
    .order("version_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latestErr) {
    throw new Error(`fetch latest version: ${latestErr.message}`);
  }

  const FIVE_MIN_MS = 5 * 60 * 1000;
  if (
    latest &&
    latest.created_by === createdBy &&
    Date.now() - new Date(latest.created_at).getTime() < FIVE_MIN_MS
  ) {
    // Coalesce: atualiza o snapshot existente
    const { error } = await admin
      .from("admin_automation_versions")
      .update({
        name: next.name,
        description: next.description,
        trigger: next.trigger,
        graph: next.graph,
        change_summary: summary,
        created_at: new Date().toISOString(),
      })
      .eq("id", latest.id);
    if (error) throw new Error(`coalesce version: ${error.message}`);
    return { created: false, versionNumber: latest.version_number };
  }

  // Insert nova
  const nextNumber = (latest?.version_number ?? 0) + 1;
  const { error } = await admin.from("admin_automation_versions").insert({
    automation_id: automationId,
    version_number: nextNumber,
    name: next.name,
    description: next.description,
    trigger: next.trigger,
    graph: next.graph,
    change_summary: summary,
    created_by: createdBy,
  });
  if (error) throw new Error(`insert version: ${error.message}`);
  return { created: true, versionNumber: nextNumber };
}

function hasMaterialChange(prev: AutomationSnapshot, next: AutomationSnapshot): boolean {
  if (prev.name !== next.name) return true;
  if ((prev.description ?? "") !== (next.description ?? "")) return true;
  if (JSON.stringify(prev.trigger) !== JSON.stringify(next.trigger)) return true;
  if (JSON.stringify(canonicalGraph(prev.graph)) !== JSON.stringify(canonicalGraph(next.graph))) {
    return true;
  }
  return false;
}

/**
 * Normaliza o graph pra comparar — ignora position (drag-and-drop visual
 * sem mudança lógica não conta como diff).
 */
function canonicalGraph(graph: AutomationGraph): unknown {
  return {
    nodes: graph.nodes
      .map((n) => ({
        id: n.id,
        type: n.type,
        data: n.data,
      }))
      .sort((a, b) => a.id.localeCompare(b.id)),
    edges: graph.edges
      .map((e) => ({
        source: e.source,
        target: e.target,
        sourceHandle: e.sourceHandle ?? null,
        targetHandle: e.targetHandle ?? null,
      }))
      .sort((a, b) => `${a.source}>${a.target}`.localeCompare(`${b.source}>${b.target}`)),
  };
}

function summarizeDiff(prev: AutomationSnapshot, next: AutomationSnapshot): string {
  const parts: string[] = [];
  if (prev.name !== next.name) parts.push(`nome: "${prev.name}" → "${next.name}"`);
  if ((prev.description ?? "") !== (next.description ?? "")) parts.push("descrição alterada");
  if (JSON.stringify(prev.trigger) !== JSON.stringify(next.trigger)) {
    parts.push("trigger reconfigurado");
  }

  const prevNodeCount = prev.graph.nodes.length;
  const nextNodeCount = next.graph.nodes.length;
  if (prevNodeCount !== nextNodeCount) {
    const delta = nextNodeCount - prevNodeCount;
    parts.push(`${delta > 0 ? "+" : ""}${delta} nó${Math.abs(delta) !== 1 ? "s" : ""}`);
  }
  const prevEdgeCount = prev.graph.edges.length;
  const nextEdgeCount = next.graph.edges.length;
  if (prevEdgeCount !== nextEdgeCount) {
    const delta = nextEdgeCount - prevEdgeCount;
    parts.push(`${delta > 0 ? "+" : ""}${delta} conexão${Math.abs(delta) !== 1 ? "ões" : ""}`);
  }

  // Detecta config-only changes nos nodes
  if (parts.length === 0) {
    const prevById = new Map(prev.graph.nodes.map((n) => [n.id, n]));
    let configChanges = 0;
    for (const n of next.graph.nodes) {
      const p = prevById.get(n.id);
      if (p && JSON.stringify(p.data.config) !== JSON.stringify(n.data.config)) {
        configChanges++;
      }
    }
    if (configChanges > 0) {
      parts.push(
        `${configChanges} nó${configChanges !== 1 ? "s" : ""} reconfigurado${configChanges !== 1 ? "s" : ""}`,
      );
    }
  }

  return parts.length === 0 ? "alteração no graph" : parts.join("; ");
}
