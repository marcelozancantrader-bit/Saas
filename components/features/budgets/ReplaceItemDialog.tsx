"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { searchSinapiAction, type SinapiRow } from "@/server/actions/budgets/search-sinapi.action";
import { replaceBudgetItemAction } from "@/server/actions/budgets/replace-item.action";
import { formatBRL } from "@/lib/utils/money";
import { formatCodigoExibicao } from "@/lib/budget/format-codigo";
import { toast } from "sonner";
import type { BudgetItem } from "@/app/(app)/projetos/[id]/orcamento/[budgetId]/page";

type Props = {
  item: BudgetItem | null;
  uf: string;
  mesReferencia: string;
  desonerado: boolean;
  onClose: () => void;
};

export function ReplaceItemDialog({ item, uf, mesReferencia, desonerado, onClose }: Props) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SinapiRow[]>([]);
  const [searching, startSearch] = useTransition();
  const [replacing, startReplace] = useTransition();
  const [replacingCodigo, setReplacingCodigo] = useState<string | null>(null);

  function doSearch() {
    if (query.trim().length < 2) {
      toast.error("Digite ao menos 2 caracteres");
      return;
    }
    startSearch(async () => {
      const r = await searchSinapiAction({
        query: query.trim(),
        uf,
        mes_referencia: mesReferencia,
        desonerado,
      });
      if (r.ok) {
        setResults(r.results);
        if (r.results.length === 0) toast.warning("Nenhum resultado");
      } else {
        toast.error(r.error);
      }
    });
  }

  function doReplace(row: SinapiRow) {
    if (!item) return;
    setReplacingCodigo(row.codigo);
    startReplace(async () => {
      const r = await replaceBudgetItemAction({
        item_id: item.id,
        codigo: row.codigo,
        descricao: row.descricao,
        unidade: row.unidade,
        preco_unitario: row.preco,
        origem: "sinapi",
      });
      setReplacingCodigo(null);
      if (r.ok) {
        toast.success(`Item substituído por ${row.codigo}. Quantidade preservada.`);
        handleClose();
        router.refresh();
      } else {
        toast.error(r.error);
      }
    });
  }

  function handleClose() {
    setQuery("");
    setResults([]);
    setReplacingCodigo(null);
    onClose();
  }

  return (
    <Dialog open={!!item} onOpenChange={(v) => !replacing && !v && handleClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Substituir item por outro do SINAPI</DialogTitle>
          <DialogDescription>
            Busque pela descrição ou código. Ao clicar no resultado, o item atual é substituído
            mantendo a mesma quantidade ({item ? Number(item.quantidade).toFixed(2) : "—"}{" "}
            {item?.unidade}).
          </DialogDescription>
        </DialogHeader>

        {item ? (
          <div className="rounded-md border border-zinc-200 bg-zinc-50 p-3 text-sm dark:border-zinc-800 dark:bg-zinc-900">
            <p className="text-xs text-zinc-500">Item atual:</p>
            <p className="mt-0.5 font-medium">
              <code className="text-xs text-zinc-500">
                {formatCodigoExibicao(item.composicao_codigo, item.origem)}
              </code>{" "}
              — {item.descricao}
            </p>
            <p className="mt-0.5 text-xs text-zinc-500">
              {Number(item.quantidade).toFixed(2)} {item.unidade} · {formatBRL(item.preco_unitario)}{" "}
              / {item.unidade} · <span className="font-medium">{formatBRL(item.total)}</span>
            </p>
          </div>
        ) : null}

        <div className="space-y-3">
          <div className="flex gap-2">
            <Input
              placeholder="ex: porcelanato, porta maciça, 87263…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  doSearch();
                }
              }}
              autoFocus
            />
            <Button onClick={doSearch} disabled={searching}>
              {searching ? "Buscando…" : "Buscar"}
            </Button>
          </div>

          <p className="text-xs text-zinc-500">
            Catálogo: SINAPI {uf} · {mesReferencia} · {desonerado ? "desonerado" : "não-desonerado"}
          </p>

          {results.length > 0 ? (
            <div className="max-h-80 space-y-1 overflow-y-auto rounded-md border p-1">
              {results.map((r) => {
                const isCurrent = r.codigo === item?.composicao_codigo;
                const isReplacing = replacingCodigo === r.codigo;
                return (
                  <button
                    key={r.codigo}
                    type="button"
                    disabled={isCurrent || replacing}
                    onClick={() => doReplace(r)}
                    className={`block w-full rounded-md px-2 py-1.5 text-left text-sm transition-colors ${
                      isCurrent
                        ? "cursor-not-allowed bg-zinc-50 opacity-50 dark:bg-zinc-900"
                        : "hover:bg-blue-50 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none dark:hover:bg-blue-950/40"
                    } ${isReplacing ? "animate-pulse" : ""}`}
                    aria-label={`Substituir por ${r.codigo} ${r.descricao}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <code className="text-xs text-zinc-500">{r.codigo}</code>
                      <span className="text-xs text-zinc-500">
                        {formatBRL(r.preco)} / {r.unidade}
                        {isCurrent ? " · item atual" : ""}
                        {isReplacing ? " · aplicando…" : ""}
                      </span>
                    </div>
                    <p className="mt-0.5 line-clamp-2 text-sm">{r.descricao}</p>
                  </button>
                );
              })}
            </div>
          ) : query.length > 0 && !searching ? (
            <p className="rounded-md border border-dashed border-zinc-300 p-4 text-center text-xs text-zinc-500 dark:border-zinc-700">
              Aperte Buscar ou Enter para listar resultados.
            </p>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={replacing}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
