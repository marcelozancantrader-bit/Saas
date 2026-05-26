"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CheckCircle2, XCircle, Play } from "lucide-react";
import { testRunAutomationAction } from "@/server/actions/admin/automations/test-run.action";

type RunStep = {
  node_id: string;
  action_type: string;
  status: string;
  output?: unknown;
  error?: string;
  duration_ms: number;
};

type Props = {
  open: boolean;
  onClose: () => void;
  automationId: string;
  examplePayload: Record<string, unknown>;
};

export function TestRunDialog({ open, onClose, automationId, examplePayload }: Props) {
  const [payloadText, setPayloadText] = useState(() => JSON.stringify(examplePayload, null, 2));
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<{ status: string; steps: RunStep[] } | null>(null);

  function runTest() {
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(payloadText);
    } catch (e) {
      toast.error(`JSON inválido: ${e instanceof Error ? e.message : String(e)}`);
      return;
    }
    startTransition(async () => {
      const r = await testRunAutomationAction({ id: automationId, payload: parsed });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      setResult({ status: r.status, steps: r.steps as RunStep[] });
    });
  }

  function handleClose() {
    if (pending) return;
    setResult(null);
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Testar automação</DialogTitle>
          <DialogDescription>
            Roda com payload mock SEM persistir histórico. Útil pra validar config antes de ativar.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="test-payload">Payload (JSON)</Label>
            <Textarea
              id="test-payload"
              value={payloadText}
              onChange={(e) => setPayloadText(e.target.value)}
              rows={8}
              className="font-mono text-xs"
              disabled={pending}
            />
          </div>

          {result ? (
            <div
              className={`rounded-md border p-3 text-sm ${
                result.status === "success"
                  ? "border-emerald-300 bg-emerald-50 dark:border-emerald-900/40 dark:bg-emerald-950/30"
                  : "border-rose-300 bg-rose-50 dark:border-rose-900/40 dark:bg-rose-950/30"
              }`}
            >
              <p className="font-medium">{result.status === "success" ? "✓ Sucesso" : "✗ Falha"}</p>
              <div className="mt-2 space-y-1.5">
                {result.steps.map((s, i) => (
                  <div
                    key={`${s.node_id}-${i}`}
                    className="rounded border border-zinc-200 bg-white px-2 py-1.5 text-xs dark:border-zinc-800 dark:bg-zinc-900"
                  >
                    <div className="flex items-center gap-1.5">
                      {s.status === "success" ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                      ) : (
                        <XCircle className="h-3.5 w-3.5 text-rose-600" />
                      )}
                      <span className="font-mono text-[11px]">{s.action_type}</span>
                      <span className="text-[10px] text-zinc-500">{s.duration_ms}ms</span>
                    </div>
                    {s.error ? (
                      <p className="mt-1 text-[11px] text-rose-700 dark:text-rose-400">{s.error}</p>
                    ) : null}
                    {s.output ? (
                      <pre className="mt-1 overflow-x-auto text-[10px] text-zinc-600 dark:text-zinc-400">
                        {JSON.stringify(s.output, null, 2)}
                      </pre>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={pending}>
            Fechar
          </Button>
          <Button onClick={runTest} disabled={pending}>
            <Play className="mr-1.5 h-3.5 w-3.5" />
            {pending ? "Executando…" : "Rodar agora"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
