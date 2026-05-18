"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { buttonVariants, Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { createDemoProjectAction } from "@/server/actions/demo/create-demo-project.action";

const STEPS = [
  {
    n: 1,
    titulo: "Cadastre cliente + projeto",
    detalhe: "Nome, tipologia, endereço da obra e (opcional) cidade/zona pra validar zoneamento.",
  },
  {
    n: 2,
    titulo: "Suba a planta em PDF",
    detalhe:
      "A IA detecta ambientes, áreas e elementos especiais em ~1min. Você revisa e confirma.",
  },
  {
    n: 3,
    titulo: "Gere os documentos por IA",
    detalhe: "Memorial, caderno, proposta, contrato, cronograma, estrutural… 10 tipos prontos.",
  },
  {
    n: 4,
    titulo: "Envie ao cliente pelo portal",
    detalhe: "Cliente abre link único, lê, assina por desenho. Aprovação com IP + hash registrada.",
  },
];

export function WelcomeCard() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [creating, setCreating] = useState(false);

  function explorar() {
    setCreating(true);
    startTransition(async () => {
      const r = await createDemoProjectAction();
      if (!r.ok) {
        toast.error(r.error);
        setCreating(false);
        return;
      }
      toast.success("Projeto exemplo pronto! Explore tudo à vontade.");
      router.push(`/projetos/${r.project_id}?demo=1`);
    });
  }

  return (
    <Card className="border-primary/30 from-primary/5 dark:border-primary/40 dark:from-primary/10 bg-gradient-to-br to-white dark:to-zinc-900">
      <CardContent className="space-y-6 p-6">
        <div>
          <p className="text-primary text-xs font-medium tracking-wider uppercase">
            Bem-vindo ao Memorial.ai
          </p>
          <h2 className="mt-2 text-xl font-semibold tracking-tight">
            Da planta ao contrato em horas, não semanas.
          </h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Você pode explorar um projeto exemplo agora (1 clique, 2 segundos) ou criar o primeiro
            projeto real do seu escritório.
          </p>
        </div>

        <div className="border-primary/40 dark:border-primary/50 flex flex-col gap-3 rounded-lg border bg-white p-4 sm:flex-row sm:items-center sm:justify-between dark:bg-zinc-900">
          <div className="min-w-0">
            <p className="font-medium">🚀 Quero ver o produto funcionando agora</p>
            <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
              Cria automaticamente um projeto Casa 120m² com planta extraída, 4 documentos prontos e
              briefing preenchido. Você navega tudo em 30 segundos.
            </p>
          </div>
          <Button onClick={explorar} disabled={pending || creating} className="shrink-0">
            {creating ? "Criando…" : "Explorar exemplo →"}
          </Button>
        </div>

        <details className="rounded-lg border border-zinc-200 dark:border-zinc-800">
          <summary className="cursor-pointer p-4 text-sm font-medium">
            Ou veja como funciona em 4 passos
          </summary>
          <div className="space-y-3 px-4 pb-4">
            {STEPS.map((step) => (
              <div key={step.n} className="flex gap-3">
                <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-xs font-semibold text-white dark:bg-zinc-100 dark:text-zinc-900">
                  {step.n}
                </span>
                <div>
                  <p className="text-sm font-medium">{step.titulo}</p>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400">{step.detalhe}</p>
                </div>
              </div>
            ))}
            <div className="flex flex-wrap gap-2 pt-2">
              <Link href="/clientes/novo" className={buttonVariants({ size: "sm" })}>
                Começar do zero (criar cliente)
              </Link>
              <Link
                href="/projetos/novo"
                className={buttonVariants({ size: "sm", variant: "outline" })}
              >
                Criar projeto direto
              </Link>
            </div>
          </div>
        </details>
      </CardContent>
    </Card>
  );
}
