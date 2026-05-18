"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { searchSinapiAction, type SinapiRow } from "@/server/actions/budgets/search-sinapi.action";
import { addBudgetItemAction } from "@/server/actions/budgets/add-item.action";
import { formatBRL } from "@/lib/utils/money";
import { toast } from "sonner";

type Props = {
  budgetId: string;
  uf: string;
  mesReferencia: string;
  desonerado: boolean;
};

export function AddItemDialog({ budgetId, uf, mesReferencia, desonerado }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SinapiRow[]>([]);
  const [searching, startSearch] = useTransition();
  const [, startAdd] = useTransition();
  const [qty, setQty] = useState("1");
  const [selected, setSelected] = useState<SinapiRow | null>(null);

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

  function doAdd() {
    if (!selected) {
      toast.error("Selecione uma composição");
      return;
    }
    const qtyNum = Number(qty);
    if (!Number.isFinite(qtyNum) || qtyNum <= 0) {
      toast.error("Quantidade inválida");
      return;
    }
    startAdd(async () => {
      const r = await addBudgetItemAction({
        budget_id: budgetId,
        codigo: selected.codigo,
        descricao: selected.descricao,
        unidade: selected.unidade,
        quantidade: qtyNum,
        preco_unitario: selected.preco,
        origem: "sinapi",
      });
      if (r.ok) {
        toast.success("Item adicionado");
        setOpen(false);
        setQuery("");
        setResults([]);
        setSelected(null);
        setQty("1");
        router.refresh();
      } else {
        toast.error(r.error);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm">
            + Adicionar item
          </Button>
        }
      />
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Adicionar item ao orçamento</DialogTitle>
          <DialogDescription>
            Busca na tabela SINAPI ({uf}, {mesReferencia},{" "}
            {desonerado ? "desonerado" : "não-desonerado"}). Digite parte da descrição ou o código.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="flex gap-2">
            <Input
              placeholder="ex: alvenaria, piso cerâmico, 87878…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  doSearch();
                }
              }}
            />
            <Button onClick={doSearch} disabled={searching}>
              {searching ? "Buscando…" : "Buscar"}
            </Button>
          </div>

          {results.length > 0 ? (
            <div className="max-h-72 space-y-1 overflow-y-auto rounded-md border p-1">
              {results.map((r) => (
                <button
                  key={r.codigo}
                  type="button"
                  onClick={() => setSelected(r)}
                  className={`block w-full rounded-md px-2 py-1.5 text-left text-sm transition-colors ${
                    selected?.codigo === r.codigo
                      ? "bg-zinc-100 dark:bg-zinc-800"
                      : "hover:bg-zinc-50 dark:hover:bg-zinc-900"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <code className="text-xs text-zinc-500">{r.codigo}</code>
                    <span className="text-xs text-zinc-500">
                      {formatBRL(r.preco)} / {r.unidade}
                    </span>
                  </div>
                  <p className="mt-0.5 line-clamp-2 text-sm">{r.descricao}</p>
                </button>
              ))}
            </div>
          ) : null}

          {selected ? (
            <div className="space-y-2 rounded-md border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900">
              <p className="text-xs text-zinc-500">Selecionado:</p>
              <p className="text-sm">
                <code className="text-xs text-zinc-500">{selected.codigo}</code> —{" "}
                {selected.descricao}
              </p>
              <div className="flex items-end gap-2">
                <div className="space-y-1.5">
                  <Label htmlFor="qty">Quantidade ({selected.unidade})</Label>
                  <Input
                    id="qty"
                    type="number"
                    step="0.01"
                    min="0"
                    value={qty}
                    onChange={(e) => setQty(e.target.value)}
                    className="w-32"
                  />
                </div>
                <p className="pb-1.5 text-sm text-zinc-500">
                  Preço unit.: {formatBRL(selected.preco)} · Total:{" "}
                  {formatBRL((Number(qty) || 0) * selected.preco)}
                </p>
              </div>
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={doAdd} disabled={!selected}>
            Adicionar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
