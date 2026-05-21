"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  upsertFeatureFlagAction,
  deleteFeatureFlagAction,
} from "@/server/actions/admin/feature-flag.action";
import type { FeatureFlagRow } from "@/server/services/admin-flags";
import { Plus, Trash2, Edit } from "lucide-react";

type Props = {
  flags: FeatureFlagRow[];
};

export function FeatureFlagsManager({ flags }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<FeatureFlagRow | null>(null);
  const [orgId, setOrgId] = useState("");
  const [key, setKey] = useState("");
  const [value, setValue] = useState("true");
  const [expiresAt, setExpiresAt] = useState("");
  const [notes, setNotes] = useState("");
  const [pending, startTransition] = useTransition();

  function openCreate() {
    setEditing(null);
    setOrgId("");
    setKey("");
    setValue("true");
    setExpiresAt("");
    setNotes("");
    setOpen(true);
  }

  function openEdit(f: FeatureFlagRow) {
    setEditing(f);
    setOrgId(f.org_id ?? "");
    setKey(f.key);
    setValue(JSON.stringify(f.value));
    setExpiresAt(f.expires_at ? f.expires_at.slice(0, 16) : "");
    setNotes(f.notes ?? "");
    setOpen(true);
  }

  function handleSubmit() {
    if (!key.trim() || !value.trim()) {
      toast.error("Key e value são obrigatórios.");
      return;
    }
    startTransition(async () => {
      const r = await upsertFeatureFlagAction({
        org_id: orgId.trim() === "" ? null : orgId.trim(),
        key: key.trim(),
        value: value.trim(),
        expires_at: expiresAt || null,
        notes: notes || null,
      });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success(editing ? "Flag atualizada." : "Flag criada.");
      setOpen(false);
      router.refresh();
    });
  }

  function handleDelete(id: string, fkey: string) {
    if (!confirm(`Deletar flag "${fkey}"?`)) return;
    startTransition(async () => {
      const r = await deleteFeatureFlagAction({ id });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success("Flag removida.");
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button size="sm" onClick={openCreate}>
          <Plus className="mr-1 h-3.5 w-3.5" /> Nova flag
        </Button>
      </div>

      <div className="overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900/30">
        <table className="w-full text-sm">
          <thead className="border-b border-zinc-800 bg-zinc-900/60 text-xs tracking-wide text-zinc-500 uppercase">
            <tr>
              <th className="px-3 py-2 text-left font-medium">Escopo</th>
              <th className="px-3 py-2 text-left font-medium">Key</th>
              <th className="px-3 py-2 text-left font-medium">Value</th>
              <th className="px-3 py-2 text-left font-medium">Expira</th>
              <th className="px-3 py-2 text-left font-medium">Notas</th>
              <th className="px-3 py-2 text-right font-medium">Ações</th>
            </tr>
          </thead>
          <tbody>
            {flags.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-sm text-zinc-500">
                  Nenhuma feature flag criada ainda.
                </td>
              </tr>
            )}
            {flags.map((f) => (
              <tr key={f.id} className="border-b border-zinc-800/60 hover:bg-zinc-900/40">
                <td className="px-3 py-2.5 text-xs">
                  {f.org_id ? (
                    <span className="text-zinc-300">{f.org_name ?? f.org_id.slice(0, 8)}</span>
                  ) : (
                    <span className="text-amber-300">global</span>
                  )}
                </td>
                <td className="px-3 py-2.5">
                  <code className="text-zinc-200">{f.key}</code>
                </td>
                <td className="px-3 py-2.5">
                  <code className="text-zinc-400">{JSON.stringify(f.value)}</code>
                </td>
                <td className="px-3 py-2.5 text-xs text-zinc-500">
                  {f.expires_at ? new Date(f.expires_at).toLocaleString("pt-BR") : "nunca"}
                </td>
                <td className="px-3 py-2.5 text-xs text-zinc-500">{f.notes ?? "—"}</td>
                <td className="px-3 py-2.5 text-right">
                  <div className="flex justify-end gap-1">
                    <button
                      type="button"
                      onClick={() => openEdit(f)}
                      className="rounded p-1 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
                      aria-label="Editar"
                    >
                      <Edit className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(f.id, f.key)}
                      className="rounded p-1 text-rose-400 hover:bg-rose-950/40"
                      aria-label="Deletar"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Editar flag" : "Nova feature flag"}</DialogTitle>
            <DialogDescription>
              Valor precisa ser JSON válido (true, false, número, ou string entre aspas).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="ff_org">Org ID (vazio = global)</Label>
              <input
                id="ff_org"
                value={orgId}
                onChange={(e) => setOrgId(e.target.value)}
                placeholder="uuid ou vazio"
                disabled={!!editing}
                className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-2 py-1.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-amber-500 focus:outline-none disabled:opacity-60"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ff_key">Key</Label>
              <input
                id="ff_key"
                value={key}
                onChange={(e) => setKey(e.target.value)}
                placeholder="ex.: ai_extraction_v2_enabled"
                disabled={!!editing}
                className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-2 py-1.5 text-sm text-zinc-100 focus:border-amber-500 focus:outline-none disabled:opacity-60"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ff_value">Value (JSON)</Label>
              <input
                id="ff_value"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder='true, false, 100, "texto"'
                className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-2 py-1.5 text-sm text-zinc-100 focus:border-amber-500 focus:outline-none"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ff_exp">Expira em (opcional)</Label>
              <input
                id="ff_exp"
                type="datetime-local"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-2 py-1.5 text-sm text-zinc-100 focus:border-amber-500 focus:outline-none"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ff_notes">Notas (opcional)</Label>
              <input
                id="ff_notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Por que essa flag existe"
                className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-2 py-1.5 text-sm text-zinc-100 focus:border-amber-500 focus:outline-none"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={pending}>
              {pending ? "Salvando…" : editing ? "Atualizar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
