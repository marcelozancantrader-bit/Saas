"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatBRL } from "@/lib/utils/money";
import { updateBudgetItemAction } from "@/server/actions/budgets/update-item.action";
import { deleteBudgetItemAction } from "@/server/actions/budgets/delete-item.action";
import { AddItemDialog } from "./AddItemDialog";
import type { BudgetItem } from "@/app/(app)/projetos/[id]/orcamento/[budgetId]/page";
import { DISCIPLINA_LABEL, type Disciplina } from "@/lib/ai/prompts/_shared-extraction-schema";
import { formatCodigoExibicao } from "@/lib/budget/format-codigo";
import { toast } from "sonner";

type Props = {
  items: BudgetItem[];
  budgetId: string;
  uf: string;
  mesReferencia: string;
  desonerado: boolean;
};

export function BudgetItemsTable({ items, budgetId, uf, mesReferencia, desonerado }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState<Record<string, { qty: string; preco: string }>>({});

  function setField(id: string, key: "qty" | "preco", value: string) {
    setEditing((prev) => ({
      ...prev,
      [id]: { ...(prev[id] ?? { qty: "", preco: "" }), [key]: value },
    }));
  }

  function saveItem(item: BudgetItem) {
    const edit = editing[item.id];
    if (!edit) return;
    const newQty = edit.qty === "" ? Number(item.quantidade) : Number(edit.qty);
    const newPreco = edit.preco === "" ? Number(item.preco_unitario) : Number(edit.preco);
    startTransition(async () => {
      const r = await updateBudgetItemAction({
        item_id: item.id,
        quantidade: newQty,
        preco_unitario: newPreco,
      });
      if (r.ok) {
        toast.success(`Item atualizado — total c/ BDI ${formatBRL(r.total_com_bdi)}`);
        setEditing((prev) => {
          const next = { ...prev };
          delete next[item.id];
          return next;
        });
        router.refresh();
      } else {
        toast.error(r.error);
      }
    });
  }

  function removeItem(item: BudgetItem) {
    if (!confirm(`Remover "${item.descricao}"?`)) return;
    startTransition(async () => {
      const r = await deleteBudgetItemAction(item.id);
      if (r.ok) {
        toast.success("Item removido");
        router.refresh();
      } else {
        toast.error(r.error);
      }
    });
  }

  if (items.length === 0) {
    return (
      <p className="text-sm text-zinc-500">
        Nenhum item no orçamento. Adicione um item via SINAPI:
        <div className="mt-3">
          <AddItemDialog
            budgetId={budgetId}
            uf={uf}
            mesReferencia={mesReferencia}
            desonerado={desonerado}
          />
        </div>
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">#</TableHead>
              <TableHead className="w-20">Código</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead className="w-20">Un.</TableHead>
              <TableHead className="w-28 text-right">Qty</TableHead>
              <TableHead className="w-32 text-right">Preço un.</TableHead>
              <TableHead className="w-32 text-right">Total</TableHead>
              <TableHead className="w-32 text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item, idx) => {
              const edit = editing[item.id];
              const isEditing = !!edit;
              const currentQty = edit?.qty ?? Number(item.quantidade).toFixed(2);
              const currentPreco = edit?.preco ?? Number(item.preco_unitario).toFixed(2);
              const computedTotal =
                isEditing && edit
                  ? (
                      Number(edit.qty || item.quantidade) *
                      Number(edit.preco || item.preco_unitario)
                    ).toFixed(2)
                  : item.total;
              const prev = idx > 0 ? items[idx - 1]?.disciplina : null;
              const showDisciplinaHeader = item.disciplina !== prev;
              return (
                <React.Fragment key={item.id}>
                  {showDisciplinaHeader ? (
                    <TableRow className="bg-zinc-50 dark:bg-zinc-900">
                      <TableCell
                        colSpan={8}
                        className="py-1.5 text-xs font-semibold tracking-wide text-zinc-600 uppercase dark:text-zinc-400"
                      >
                        {DISCIPLINA_LABEL[item.disciplina as Disciplina]}
                      </TableCell>
                    </TableRow>
                  ) : null}
                  <TableRow>
                    <TableCell className="text-xs text-zinc-500">{item.ordem}</TableCell>
                    <TableCell className="text-xs text-zinc-600 dark:text-zinc-400">
                      {formatCodigoExibicao(item.composicao_codigo, item.origem)}
                    </TableCell>
                    <TableCell>
                      <p className="text-sm">{item.descricao}</p>
                      {item.origem !== "sinapi" ? (
                        <Badge variant="outline" className="mt-1 capitalize">
                          {item.origem.replace("_", " ")}
                        </Badge>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-xs text-zinc-600 dark:text-zinc-400">
                      {item.unidade}
                    </TableCell>
                    <TableCell className="text-right">
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={currentQty}
                        onChange={(e) => setField(item.id, "qty", e.target.value)}
                        disabled={pending}
                        className="h-8 w-24 text-right text-sm"
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={currentPreco}
                        onChange={(e) => setField(item.id, "preco", e.target.value)}
                        disabled={pending}
                        className="h-8 w-28 text-right text-sm"
                      />
                    </TableCell>
                    <TableCell className="text-right text-sm font-medium">
                      {formatBRL(computedTotal)}
                    </TableCell>
                    <TableCell className="text-right">
                      {isEditing ? (
                        <Button size="sm" onClick={() => saveItem(item)} disabled={pending}>
                          Salvar
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeItem(item)}
                          disabled={pending}
                        >
                          Remover
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                </React.Fragment>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <div className="flex justify-end">
        <AddItemDialog
          budgetId={budgetId}
          uf={uf}
          mesReferencia={mesReferencia}
          desonerado={desonerado}
        />
      </div>
    </div>
  );
}
