"use server";

import { revalidatePath } from "next/cache";
import Big from "big.js";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { applyBdi, sumMoney, toDbNumeric } from "@/lib/utils/money";

const updateItemSchema = z.object({
  item_id: z.string().uuid(),
  quantidade: z.coerce.number().nonnegative(),
  preco_unitario: z.coerce.number().nonnegative(),
  descricao: z.string().min(1).max(500).optional(),
});

export type UpdateBudgetItemInput = z.infer<typeof updateItemSchema>;

export type UpdateBudgetItemResult =
  | { ok: true; total_bruto: string; total_com_bdi: string }
  | { ok: false; error: string };

export async function updateBudgetItemAction(
  raw: UpdateBudgetItemInput,
): Promise<UpdateBudgetItemResult> {
  const parsed = updateItemSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: "Dados inválidos." };
  }

  const supabase = await createClient();

  // Fetch the item to get budget_id
  const { data: item, error: readErr } = await supabase
    .from("budget_items")
    .select("budget_id")
    .eq("id", parsed.data.item_id)
    .single();

  if (readErr || !item) {
    return { ok: false, error: "Item não encontrado." };
  }

  // Update the item
  const updatePayload: Record<string, unknown> = {
    quantidade: new Big(parsed.data.quantidade).toFixed(4),
    preco_unitario: new Big(parsed.data.preco_unitario).toFixed(4),
  };
  if (parsed.data.descricao !== undefined) {
    updatePayload.descricao = parsed.data.descricao;
  }

  const { error: updateErr } = await supabase
    .from("budget_items")
    .update(updatePayload)
    .eq("id", parsed.data.item_id);

  if (updateErr) {
    return { ok: false, error: updateErr.message };
  }

  // Recompute totals on the budget
  const totals = await recomputeBudgetTotals(item.budget_id);
  if (!totals.ok) return totals;

  revalidatePath(`/projetos`, "layout");
  return { ok: true, total_bruto: totals.total_bruto, total_com_bdi: totals.total_com_bdi };
}

/** Re-computes total_bruto + total_com_bdi for a budget after items change. Internal helper. */
export async function recomputeBudgetTotals(
  budgetId: string,
): Promise<
  { ok: true; total_bruto: string; total_com_bdi: string } | { ok: false; error: string }
> {
  const supabase = await createClient();

  const { data: budget, error: budgetErr } = await supabase
    .from("budgets")
    .select("bdi_pct, project_id")
    .eq("id", budgetId)
    .single();
  if (budgetErr || !budget) return { ok: false, error: "Orçamento não encontrado." };

  const { data: items, error: itemsErr } = await supabase
    .from("budget_items")
    .select("total")
    .eq("budget_id", budgetId);
  if (itemsErr) return { ok: false, error: itemsErr.message };

  const totalBruto = sumMoney((items ?? []).map((i) => (i.total as string | number) ?? "0"));
  const totalComBdi = applyBdi(totalBruto, budget.bdi_pct as string | number);

  const { error: budUpd } = await supabase
    .from("budgets")
    .update({
      total_bruto: toDbNumeric(totalBruto),
      total_com_bdi: toDbNumeric(totalComBdi),
    })
    .eq("id", budgetId);
  if (budUpd) return { ok: false, error: budUpd.message };

  revalidatePath(`/projetos/${budget.project_id}/orcamento/${budgetId}`);
  return {
    ok: true,
    total_bruto: toDbNumeric(totalBruto),
    total_com_bdi: toDbNumeric(totalComBdi),
  };
}
