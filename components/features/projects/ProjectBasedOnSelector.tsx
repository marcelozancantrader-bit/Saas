"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Copy } from "lucide-react";

type ProjectOption = {
  id: string;
  nome: string;
  tipologia: string;
};

type Props = {
  projects: ProjectOption[];
};

/**
 * Atalho "Importar do projeto anterior" em /projetos/novo.
 *
 * Camila tem 2-3 projetos simultâneos parecidos (mesmo cliente, mesma
 * tipologia, mesmo padrão). Em vez de digitar tudo de novo, escolhe um
 * projeto anterior e o servidor popula os campos do form via `?based_on=X`.
 */
export function ProjectBasedOnSelector({ projects }: Props) {
  const router = useRouter();
  const [selected, setSelected] = useState<string>("");
  const [pending, startTransition] = useTransition();

  if (projects.length === 0) return null;

  function apply() {
    if (!selected) return;
    startTransition(() => {
      router.push(`/projetos/novo?based_on=${selected}`);
    });
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
      <div className="flex-1 space-y-1.5">
        <label htmlFor="based-on" className="text-sm font-medium">
          Importar de projeto existente (opcional)
        </label>
        <Select value={selected} onValueChange={(v) => v && setSelected(v)}>
          <SelectTrigger id="based-on">
            <SelectValue placeholder="Comece do zero ou escolha um projeto…" />
          </SelectTrigger>
          <SelectContent>
            {projects.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.nome} ({p.tipologia})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-zinc-500">
          Copia cliente, tipologia, padrão construtivo e endereço. Nome do novo projeto continua em
          branco pra você decidir.
        </p>
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={apply}
        disabled={!selected || pending}
      >
        <Copy className="mr-1.5 h-3.5 w-3.5" />
        {pending ? "Importando…" : "Importar"}
      </Button>
    </div>
  );
}
