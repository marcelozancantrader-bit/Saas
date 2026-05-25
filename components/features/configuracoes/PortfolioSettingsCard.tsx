"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Globe } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { setPortfolioConfigAction } from "@/server/actions/organizations/set-portfolio-config.action";
import { suggestSlugFromName } from "@/lib/portfolio/slug";

type Props = {
  orgName: string;
  initialSlug: string | null;
  initialEnabled: boolean;
  canEdit: boolean;
  appHost: string;
};

export function PortfolioSettingsCard({
  orgName,
  initialSlug,
  initialEnabled,
  canEdit,
  appHost,
}: Props) {
  const router = useRouter();
  const [slug, setSlug] = useState(initialSlug ?? "");
  const [enabled, setEnabled] = useState(initialEnabled);
  const [pending, startTransition] = useTransition();

  function fillSuggestion() {
    if (slug) return;
    const next = suggestSlugFromName(orgName);
    if (next) setSlug(next);
  }

  function onSave() {
    startTransition(async () => {
      const res = await setPortfolioConfigAction({
        enabled,
        slug: slug.trim() === "" ? null : slug.trim().toLowerCase(),
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(
        enabled ? "Portfólio publicado em /p/" + (res.slug ?? "") : "Portfólio desativado.",
      );
      router.refresh();
    });
  }

  const publicUrl = slug ? `/p/${slug.trim().toLowerCase()}` : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Globe className="h-4 w-4" aria-hidden />
          Portfólio público
        </CardTitle>
        <p className="text-xs text-zinc-600 dark:text-zinc-400">
          Vitrine pública dos projetos entregues do escritório. Indexável pelo Google. Marque cada
          projeto como visível em /projetos/&lt;id&gt;.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="portfolio_slug">Endereço (slug)</Label>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <span className="text-sm text-zinc-500">{appHost}/p/</span>
            <Input
              id="portfolio_slug"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              onFocus={fillSuggestion}
              disabled={!canEdit || pending}
              placeholder="seu-escritorio"
              className="sm:max-w-xs"
            />
          </div>
          <p className="text-xs text-zinc-500">
            Letras minúsculas, números e hífen. 3-40 caracteres. Mudar quebra links já
            compartilhados.
          </p>
        </div>

        <div className="flex items-start gap-3 rounded-md border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900">
          <input
            type="checkbox"
            id="portfolio_enabled"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            disabled={!canEdit || pending}
            className="mt-0.5 h-4 w-4"
          />
          <div className="flex-1">
            <Label htmlFor="portfolio_enabled" className="cursor-pointer">
              Portfólio público ativo
            </Label>
            <p className="text-xs text-zinc-500">
              Master switch. Sem isso o /p/&lt;slug&gt; mostra 404 mesmo com slug configurado.
            </p>
          </div>
        </div>

        {enabled && publicUrl && initialEnabled && initialSlug === slug.trim().toLowerCase() ? (
          <div className="rounded-md border border-emerald-200 bg-emerald-50/40 p-3 text-xs dark:border-emerald-900/40 dark:bg-emerald-950/20">
            <p>
              Publicado em{" "}
              <Link
                href={publicUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-blue-700 hover:underline dark:text-blue-400"
              >
                {publicUrl}
              </Link>
            </p>
          </div>
        ) : null}

        {canEdit ? (
          <div className="flex justify-end">
            <Button onClick={onSave} disabled={pending}>
              {pending ? "Salvando…" : "Salvar"}
            </Button>
          </div>
        ) : (
          <p className="text-xs text-zinc-500">Só owner ou admin pode editar.</p>
        )}
      </CardContent>
    </Card>
  );
}
