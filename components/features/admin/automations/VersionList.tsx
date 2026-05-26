"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, History, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { restoreAutomationVersionAction } from "@/server/actions/admin/automations/restore-version.action";
import type { AutomationVersionRow } from "@/server/services/automation-versions";

type Version = AutomationVersionRow & { created_by_email: string | null };

export function VersionList({
  automationId,
  versions,
}: {
  automationId: string;
  versions: Version[];
}) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [restoring, setRestoring] = useState<string | null>(null);

  async function handleRestore(versionId: string, versionNumber: number) {
    if (
      !confirm(
        `Restaurar a versão #${versionNumber}? O estado atual será salvo como uma nova versão antes de sobrescrever.`,
      )
    ) {
      return;
    }
    setRestoring(versionId);
    const r = await restoreAutomationVersionAction({
      automation_id: automationId,
      version_id: versionId,
    });
    setRestoring(null);
    if (r.ok) {
      toast.success(`Versão #${versionNumber} restaurada`);
    } else {
      toast.error(`Falha: ${r.error}`);
    }
  }

  return (
    <div className="overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800">
      {versions.map((v, i) => {
        const isExpanded = expanded === v.id;
        const isLatest = i === 0;
        const nodeCount = countNodes(v.graph);
        const edgeCount = countEdges(v.graph);
        return (
          <div key={v.id} className="border-b border-zinc-200 last:border-b-0 dark:border-zinc-800">
            <div className="flex items-center gap-3 px-4 py-2.5">
              <button
                type="button"
                onClick={() => setExpanded(isExpanded ? null : v.id)}
                className="flex flex-1 items-center gap-3 text-left text-sm transition hover:bg-zinc-50 dark:hover:bg-zinc-900/50"
                aria-expanded={isExpanded}
              >
                {isExpanded ? (
                  <ChevronDown className="h-3.5 w-3.5 text-zinc-500" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5 text-zinc-500" />
                )}
                <span className="flex items-center gap-1.5 text-xs font-semibold">
                  <History className="h-3 w-3 text-zinc-500" />v{v.version_number}
                  {isLatest ? (
                    <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                      atual
                    </span>
                  ) : null}
                </span>
                <span className="flex-1 truncate text-xs text-zinc-700 dark:text-zinc-300">
                  {v.change_summary ?? "atualização"}
                </span>
                <span className="text-xs text-zinc-500">
                  {nodeCount} nós · {edgeCount} conexões
                </span>
                <span className="w-40 text-right text-xs text-zinc-500">
                  {new Date(v.created_at).toLocaleString("pt-BR")}
                </span>
              </button>
              {!isLatest ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleRestore(v.id, v.version_number)}
                  disabled={restoring === v.id}
                >
                  <RotateCcw className="mr-1.5 h-3 w-3" />
                  {restoring === v.id ? "Restaurando…" : "Restaurar"}
                </Button>
              ) : null}
            </div>

            {isExpanded ? (
              <div className="border-t border-zinc-100 bg-zinc-50/40 px-4 py-3 text-xs dark:border-zinc-900 dark:bg-zinc-950/40">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <p className="text-[10px] font-semibold tracking-wider text-zinc-500 uppercase">
                      Nome
                    </p>
                    <p className="mt-0.5 text-zinc-700 dark:text-zinc-300">{v.name}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold tracking-wider text-zinc-500 uppercase">
                      Autor
                    </p>
                    <p className="mt-0.5 text-zinc-700 dark:text-zinc-300">
                      {v.created_by_email ?? "sistema/desconhecido"}
                    </p>
                  </div>
                  {v.description ? (
                    <div className="sm:col-span-2">
                      <p className="text-[10px] font-semibold tracking-wider text-zinc-500 uppercase">
                        Descrição
                      </p>
                      <p className="mt-0.5 text-zinc-700 dark:text-zinc-300">{v.description}</p>
                    </div>
                  ) : null}
                  <div className="sm:col-span-2">
                    <p className="text-[10px] font-semibold tracking-wider text-zinc-500 uppercase">
                      Trigger
                    </p>
                    <pre className="mt-0.5 overflow-x-auto rounded border border-zinc-200 bg-white p-2 text-[10px] dark:border-zinc-800 dark:bg-zinc-900">
                      {JSON.stringify(v.trigger, null, 2)}
                    </pre>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function countNodes(graph: unknown): number {
  if (graph && typeof graph === "object" && "nodes" in graph) {
    const n = (graph as { nodes?: unknown[] }).nodes;
    return Array.isArray(n) ? n.length : 0;
  }
  return 0;
}
function countEdges(graph: unknown): number {
  if (graph && typeof graph === "object" && "edges" in graph) {
    const e = (graph as { edges?: unknown[] }).edges;
    return Array.isArray(e) ? e.length : 0;
  }
  return 0;
}
