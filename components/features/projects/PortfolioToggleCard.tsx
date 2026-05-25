"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Globe, Lock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { togglePortfolioVisibilityAction } from "@/server/actions/projects/toggle-portfolio-visibility.action";

type Props = {
  projectId: string;
  visible: boolean;
  status: string;
  orgPortfolioEnabled: boolean;
  orgPortfolioSlug: string | null;
};

/**
 * Card "Portfólio público" — toggle por projeto.
 *
 * Estados visuais:
 *   - Org sem portfólio configurado: card cinza com CTA pra /configuracoes
 *   - Status != concluido: aviso de pré-requisito
 *   - Tudo ok + visible=true: estado ativo (link pra rota pública)
 *   - Tudo ok + visible=false: CTA pra publicar
 */
export function PortfolioToggleCard({
  projectId,
  visible: initialVisible,
  status,
  orgPortfolioEnabled,
  orgPortfolioSlug,
}: Props) {
  const router = useRouter();
  const [visible, setVisible] = useState(initialVisible);
  const [pending, startTransition] = useTransition();

  const orgConfigured = orgPortfolioEnabled && !!orgPortfolioSlug;
  const statusOk = status === "concluido";

  function onToggle() {
    const newValue = !visible;
    startTransition(async () => {
      const res = await togglePortfolioVisibilityAction({
        project_id: projectId,
        visible: newValue,
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setVisible(newValue);
      toast.success(
        newValue ? "Projeto publicado no portfólio." : "Projeto removido do portfólio.",
      );
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          {visible && orgConfigured && statusOk ? (
            <Globe className="h-4 w-4 text-emerald-600" aria-hidden />
          ) : (
            <Lock className="h-4 w-4 text-zinc-400" aria-hidden />
          )}
          Portfólio público
        </CardTitle>
        <p className="text-xs text-zinc-600 dark:text-zinc-400">
          Mostre este projeto na vitrine pública do seu escritório.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {!orgConfigured ? (
          <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
            Você ainda não configurou o portfólio do escritório.{" "}
            <Link href="/configuracoes" className="font-medium underline underline-offset-2">
              Ativar em Configurações
            </Link>
            .
          </div>
        ) : !statusOk ? (
          <div className="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
            Só aparece no portfólio quando o status do projeto for <strong>Concluído</strong>. Você
            ainda pode marcar como visível — ele aparece automaticamente assim que mudar o status.
          </div>
        ) : null}

        <div className="flex items-center justify-between gap-3">
          <p className="text-sm">
            {visible ? (
              <>
                Publicado em{" "}
                {orgPortfolioSlug ? (
                  <Link
                    href={`/p/${orgPortfolioSlug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-blue-700 hover:underline dark:text-blue-400"
                  >
                    /p/{orgPortfolioSlug}
                  </Link>
                ) : (
                  "—"
                )}
              </>
            ) : (
              "Não publicado."
            )}
          </p>
          <Button
            onClick={onToggle}
            disabled={pending || !orgConfigured}
            variant={visible ? "outline" : "default"}
            size="sm"
          >
            {pending ? "Salvando…" : visible ? "Remover do portfólio" : "Publicar"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
