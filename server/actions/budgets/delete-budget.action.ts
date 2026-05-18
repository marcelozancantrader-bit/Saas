"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type DeleteBudgetResult = { ok: true } | { ok: false; error: string };

export async function deleteBudgetAction(budgetId: string): Promise<DeleteBudgetResult> {
  const supabase = await createClient();

  const { data: budget } = await supabase
    .from("budgets")
    .select("project_id")
    .eq("id", budgetId)
    .single();

  const { error } = await supabase.from("budgets").delete().eq("id", budgetId);
  if (error) return { ok: false, error: error.message };

  if (budget) {
    revalidatePath(`/projetos/${budget.project_id}/orcamento`);
  }
  return { ok: true };
}
