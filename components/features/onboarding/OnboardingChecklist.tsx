"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Circle, FolderPlus, FileSearch, Sparkles, Send, X } from "lucide-react";
import { dismissOnboardingAction } from "@/server/actions/onboarding/dismiss.action";
import type { OnboardingProgress, OnboardingStep } from "@/server/services/onboarding-progress";

type StepCopy = {
  icon: typeof Circle;
  titulo: string;
  detalheTodo: string;
  detalheDone: string;
  cta: { label: string; href: string };
};

const STEP_COPY: Record<OnboardingStep["id"], StepCopy> = {
  create_project: {
    icon: FolderPlus,
    titulo: "Crie seu primeiro projeto",
    detalheTodo: "Nome, tipologia e endereço da obra. Demora 30 segundos.",
    detalheDone: "Projeto cadastrado — bom trabalho!",
    cta: { label: "Criar projeto", href: "/projetos/novo" },
  },
  extract_plan: {
    icon: FileSearch,
    titulo: "Suba uma planta e confirme a extração",
    detalheTodo: "A IA lê o PDF, identifica ambientes e áreas. Você revisa e confirma em 1 clique.",
    detalheDone: "Planta extraída e confirmada — IA já tem o contexto da obra.",
    cta: { label: "Ver projetos", href: "/projetos" },
  },
  generate_doc: {
    icon: Sparkles,
    titulo: "Gere o primeiro documento por IA",
    detalheTodo: "Memorial, proposta, contrato, cronograma… 10 tipos prontos em menos de 1min.",
    detalheDone: "Documento gerado — o trabalho braçal já valeu o plano.",
    cta: { label: "Ver projetos", href: "/projetos" },
  },
  send_portal: {
    icon: Send,
    titulo: "Envie um documento ao cliente pelo portal",
    detalheTodo: "Cliente recebe link único, lê, assina por desenho. Prova legal registrada.",
    detalheDone: "Documento já está no portal aguardando o cliente assinar.",
    cta: { label: "Ver projetos", href: "/projetos" },
  },
};

type Props = {
  progress: OnboardingProgress;
};

export function OnboardingChecklist({ progress }: Props) {
  const router = useRouter();
  const [dismissing, startDismiss] = useTransition();
  const [hidden, setHidden] = useState(false);

  if (hidden) return null;

  const { steps, percent, completed } = progress;
  const nextStep = steps.find((s) => !s.done);

  function handleDismiss() {
    setHidden(true);
    startDismiss(async () => {
      const r = await dismissOnboardingAction();
      if (!r.ok) {
        toast.error(r.error);
        setHidden(false);
        return;
      }
      router.refresh();
    });
  }

  return (
    <Card className="relative border-blue-200 bg-gradient-to-br from-blue-50/50 via-white to-white shadow-sm dark:border-blue-900/40 dark:from-blue-950/20 dark:via-zinc-900 dark:to-zinc-900">
      <CardContent className="space-y-5 p-6">
        <button
          type="button"
          onClick={handleDismiss}
          disabled={dismissing}
          className="absolute top-3 right-3 rounded-full p-1 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
          aria-label="Dispensar checklist de onboarding"
          title="Dispensar"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-start gap-3">
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-950/40">
            <Sparkles className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold tracking-wider text-blue-700 uppercase dark:text-blue-400">
              Primeiros passos
            </p>
            <h2 className="mt-1 text-lg font-semibold tracking-tight">
              {completed
                ? "Você dominou o Memorial.ai!"
                : "Em ~30 minutos você tem um projeto rodando ponta a ponta"}
            </h2>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              {completed
                ? "Tudo configurado. Clique no X pra esconder este card."
                : "Conclua os 4 passos pra ver o fluxo completo do produto."}
            </p>
          </div>
        </div>

        {/* Barra de progresso */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-zinc-700 dark:text-zinc-300">
              {steps.filter((s) => s.done).length} de {steps.length} passos concluídos
            </span>
            <span className="font-semibold text-blue-700 tabular-nums dark:text-blue-400">
              {percent}%
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-500 ease-out"
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>

        {/* Lista de passos */}
        <ol className="space-y-2">
          {steps.map((step, idx) => {
            const copy = STEP_COPY[step.id];
            const Icon = step.done ? CheckCircle2 : copy.icon;
            const isNext = !step.done && step === nextStep;

            return (
              <li
                key={step.id}
                className={`flex items-start gap-3 rounded-lg border p-3 transition ${
                  step.done
                    ? "border-emerald-200 bg-emerald-50/40 dark:border-emerald-900/40 dark:bg-emerald-950/10"
                    : isNext
                      ? "border-blue-300 bg-white shadow-sm dark:border-blue-700 dark:bg-zinc-900"
                      : "border-zinc-200 bg-white/60 dark:border-zinc-800 dark:bg-zinc-900/60"
                }`}
              >
                <Icon
                  className={`mt-0.5 h-5 w-5 shrink-0 ${
                    step.done
                      ? "text-emerald-600 dark:text-emerald-400"
                      : isNext
                        ? "text-blue-600 dark:text-blue-400"
                        : "text-zinc-400"
                  }`}
                  aria-hidden
                />
                <div className="min-w-0 flex-1">
                  <p
                    className={`text-sm font-medium ${
                      step.done ? "text-zinc-500 line-through dark:text-zinc-400" : ""
                    }`}
                  >
                    {idx + 1}. {copy.titulo}
                  </p>
                  <p className="mt-0.5 text-xs text-zinc-600 dark:text-zinc-400">
                    {step.done ? copy.detalheDone : copy.detalheTodo}
                  </p>
                </div>
                {isNext ? (
                  <Button
                    size="sm"
                    className="shrink-0"
                    render={<Link href={copy.cta.href}>{copy.cta.label}</Link>}
                  />
                ) : null}
              </li>
            );
          })}
        </ol>

        {completed ? (
          <div className="flex items-center justify-between gap-2 border-t border-zinc-200 pt-3 dark:border-zinc-800">
            <p className="text-xs text-zinc-500">
              Parabéns! Você passou por todos os marcos principais do produto.
            </p>
            <Button size="sm" variant="outline" onClick={handleDismiss} disabled={dismissing}>
              {dismissing ? "Fechando…" : "Fechar checklist"}
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
