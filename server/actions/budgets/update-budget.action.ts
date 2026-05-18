"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { recomputeBudgetTotals } from "./update-item.action";

const updateBudgetSchema = z.object({
  budget_id: z.string().uuid(),
  bdi_pct: z.coerce.number().min(0).max(100).optional(),
  observacoes: z.string().max(2000).optional(),
  status: z.enum(["rascunho", "finalizado"]).optional(),
});

export type UpdateBudgetInput = z.infer<typeof updateBudgetSchema>;

export type UpdateBudgetResult =
  | { ok: true; total_bruto?: string; total_com_bdi?: string }
  | { ok: false; error: string };

export async function updateBudgetAction(raw: UpdateBudgetInput): Promise<UpdateBudgetResult> {
  const parsed = updateBudgetSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Dados inválidos." };

  const supabase = await createClient();
  const payload: Record<string, unknown> = {};
  if (parsed.data.bdi_pct !== undefined) payload.bdi_pct = parsed.data.bdi_pct;
  if (parsed.data.observacoes !== undefined) payload.observacoes = parsed.data.observacoes;
  if (parsed.data.status !== undefined) payload.status = parsed.data.status;

  const { error } = await supabase.from("budgets").update(payload).eq("id", parsed.data.budget_id);
  if (error) return { ok: false, error: error.message };

  // If BDI changed, recompute totals
  if (parsed.data.bdi_pct !== undefined) {
    const totals = await recomputeBudgetTotals(parsed.data.budget_id);
    if (!totals.ok) return totals;
    revalidatePath(`/projetos`, "layout");
    return { ok: true, total_bruto: totals.total_bruto, total_com_bdi: totals.total_com_bdi };
  }

  revalidatePath(`/projetos`, "layout");
  return { ok: true };
}
