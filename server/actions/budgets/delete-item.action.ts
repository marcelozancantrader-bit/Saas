"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { recomputeBudgetTotals } from "./update-item.action";

export type DeleteBudgetItemResult = { ok: true } | { ok: false; error: string };

export async function deleteBudgetItemAction(itemId: string): Promise<DeleteBudgetItemResult> {
  const supabase = await createClient();

  const { data: item, error: readErr } = await supabase
    .from("budget_items")
    .select("budget_id")
    .eq("id", itemId)
    .single();
  if (readErr || !item) return { ok: false, error: "Item não encontrado." };

  const { error: delErr } = await supabase.from("budget_items").delete().eq("id", itemId);
  if (delErr) return { ok: false, error: delErr.message };

  await recomputeBudgetTotals(item.budget_id);
  revalidatePath(`/projetos`, "layout");
  return { ok: true };
}
