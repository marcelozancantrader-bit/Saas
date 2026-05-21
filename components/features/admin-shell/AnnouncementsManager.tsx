"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
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
import { Badge } from "@/components/ui/badge";
import {
  createAnnouncementAction,
  toggleAnnouncementAction,
} from "@/server/actions/admin/announcement.action";
import type { AnnouncementRow } from "@/server/services/admin-flags";
import { Plus, Megaphone, Info, AlertTriangle, AlertCircle, CheckCircle2 } from "lucide-react";

type Props = { announcements: AnnouncementRow[] };

const SEVERITY_COLORS: Record<string, string> = {
  info: "border-blue-700 bg-blue-950/40 text-blue-300",
  success: "border-emerald-700 bg-emerald-950/40 text-emerald-300",
  warning: "border-amber-700 bg-amber-950/40 text-amber-300",
  error: "border-rose-700 bg-rose-950/40 text-rose-300",
};

const SEVERITY_ICONS: Record<string, typeof Info> = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  error: AlertCircle,
};

export function AnnouncementsManager({ announcements }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [severity, setSeverity] = useState<"info" | "success" | "warning" | "error">("info");
  const [audience, setAudience] = useState("all");
  const [linkUrl, setLinkUrl] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [pending, startTransition] = useTransition();

  function handleSubmit() {
    if (!title.trim() || !body.trim()) {
      toast.error("Título e corpo são obrigatórios.");
      return;
    }
    startTransition(async () => {
      const r = await createAnnouncementAction({
        title: title.trim(),
        body: body.trim(),
        severity,
        audience: audience.trim(),
        link_url: linkUrl || null,
        starts_at: startsAt || null,
        expires_at: expiresAt || null,
      });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success("Anúncio criado.");
      setOpen(false);
      setTitle("");
      setBody("");
      setSeverity("info");
      setAudience("all");
      setLinkUrl("");
      setStartsAt("");
      setExpiresAt("");
      router.refresh();
    });
  }

  function handleToggle(id: string, current: boolean) {
    startTransition(async () => {
      const r = await toggleAnnouncementAction({ id, is_active: !current });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success(current ? "Anúncio desativado." : "Anúncio ativado.");
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setOpen(true)}>
          <Plus className="mr-1 h-3.5 w-3.5" /> Novo anúncio
        </Button>
      </div>

      <div className="space-y-2">
        {announcements.length === 0 && (
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/30 p-8 text-center text-sm text-zinc-500">
            Nenhum anúncio criado. Use anúncios pra comunicar manutenções, novas features ou ofertas
            pra segmentos específicos.
          </div>
        )}
        {announcements.map((a) => {
          const Icon = SEVERITY_ICONS[a.severity] ?? Info;
          const isLive =
            a.is_active &&
            new Date(a.starts_at) <= new Date() &&
            (!a.expires_at || new Date(a.expires_at) > new Date());
          return (
            <div
              key={a.id}
              className="rounded-lg border border-zinc-800 bg-zinc-900/30 p-3 text-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Badge className={SEVERITY_COLORS[a.severity]}>
                      <Icon className="h-3 w-3" />
                      {a.severity}
                    </Badge>
                    <Badge variant="outline" className="text-[10px]">
                      audience: {a.audience}
                    </Badge>
                    {isLive ? (
                      <Badge className="border-emerald-700 bg-emerald-950/40 text-emerald-300">
                        ao vivo
                      </Badge>
                    ) : (
                      <Badge className="border-zinc-700 bg-zinc-900 text-zinc-500">inativo</Badge>
                    )}
                  </div>
                  <p className="mt-1.5 text-zinc-100">{a.title}</p>
                  <p className="mt-0.5 text-xs text-zinc-400">{a.body}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-3 text-[11px] text-zinc-500">
                    <span>Início: {new Date(a.starts_at).toLocaleString("pt-BR")}</span>
                    {a.expires_at && (
                      <span>Expira: {new Date(a.expires_at).toLocaleString("pt-BR")}</span>
                    )}
                    {a.link_url && (
                      <a
                        href={a.link_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-amber-300 hover:underline"
                      >
                        link
                      </a>
                    )}
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleToggle(a.id, a.is_active)}
                  disabled={pending}
                >
                  {a.is_active ? "Desativar" : "Ativar"}
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              <Megaphone className="mr-1 inline-block h-4 w-4 text-amber-400" />
              Novo anúncio
            </DialogTitle>
            <DialogDescription>
              Audiência: <code className="text-amber-300">all</code>,{" "}
              <code className="text-amber-300">paid</code>,{" "}
              <code className="text-amber-300">plan:standard</code> ou{" "}
              <code className="text-amber-300">org:&lt;uuid&gt;</code>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="ann_title">Título</Label>
              <input
                id="ann_title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={200}
                className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-2 py-1.5 text-sm text-zinc-100 focus:border-amber-500 focus:outline-none"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ann_body">Corpo</Label>
              <Textarea
                id="ann_body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={3}
                maxLength={2000}
              />
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="ann_severity">Severidade</Label>
                <select
                  id="ann_severity"
                  value={severity}
                  onChange={(e) =>
                    setSeverity(e.target.value as "info" | "success" | "warning" | "error")
                  }
                  className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-2 py-1.5 text-sm text-zinc-100 focus:border-amber-500 focus:outline-none"
                >
                  <option value="info">info</option>
                  <option value="success">success</option>
                  <option value="warning">warning</option>
                  <option value="error">error</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ann_audience">Audiência</Label>
                <input
                  id="ann_audience"
                  value={audience}
                  onChange={(e) => setAudience(e.target.value)}
                  placeholder="all"
                  className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-2 py-1.5 text-sm text-zinc-100 focus:border-amber-500 focus:outline-none"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ann_link">Link (opcional)</Label>
              <input
                id="ann_link"
                type="url"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="https://…"
                className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-2 py-1.5 text-sm text-zinc-100 focus:border-amber-500 focus:outline-none"
              />
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="ann_start">Início (opcional)</Label>
                <input
                  id="ann_start"
                  type="datetime-local"
                  value={startsAt}
                  onChange={(e) => setStartsAt(e.target.value)}
                  className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-2 py-1.5 text-sm text-zinc-100 focus:border-amber-500 focus:outline-none"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ann_exp">Expira em (opcional)</Label>
                <input
                  id="ann_exp"
                  type="datetime-local"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                  className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-2 py-1.5 text-sm text-zinc-100 focus:border-amber-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={pending}>
              {pending ? "Criando…" : "Criar anúncio"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
