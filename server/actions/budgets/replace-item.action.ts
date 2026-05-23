"use server";

import { revalidatePath } from "next/cache";
import Big from "big.js";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { recomputeBudgetTotals } from "./update-item.action";

const replaceItemSchema = z.object({
  item_id: z.string().uuid(),
  codigo: z.string().min(1).max(40),
  descricao: z.string().min(1).max(500),
  unidade: z.string().min(1).max(10),
  preco_unitario: z.coerce.number().nonnegative(),
  origem: z.enum(["sinapi", "custom", "composicao_propria"]).default("sinapi"),
});

export type ReplaceBudgetItemInput = z.infer<typeof replaceItemSchema>;

export type ReplaceBudgetItemResult =
  | { ok: true; total_bruto: string; total_com_bdi: string }
  | { ok: false; error: string };

/**
 * Substitui a composição (código + descrição + unidade + preço unitário + origem)
 * de um item do orçamento, mantendo a quantidade já cadastrada. Útil quando o
 * engenheiro percebe que a regra automática escolheu um SINAPI inadequado
 * (ex: piso cerâmico em projeto de alto padrão → trocar por porcelanato).
 */
export async function replaceBudgetItemAction(
  raw: ReplaceBudgetItemInput,
): Promise<ReplaceBudgetItemResult> {
  const parsed = replaceItemSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: "Dados inválidos." };
  }

  const supabase = await createClient();

  const { data: item, error: readErr } = await supabase
    .from("budget_items")
    .select("budget_id")
    .eq("id", parsed.data.item_id)
    .single();
  if (readErr || !item) {
    return { ok: false, error: "Item não encontrado." };
  }

  const { error: updateErr } = await supabase
    .from("budget_items")
    .update({
      composicao_codigo: parsed.data.codigo,
      descricao: parsed.data.descricao,
      unidade: parsed.data.unidade,
      preco_unitario: new Big(parsed.data.preco_unitario).toFixed(4),
      origem: parsed.data.origem,
    })
    .eq("id", parsed.data.item_id);
  if (updateErr) return { ok: false, error: updateErr.message };

  const totals = await recomputeBudgetTotals(item.budget_id);
  if (!totals.ok) return totals;

  revalidatePath(`/projetos`, "layout");
  return { ok: true, total_bruto: totals.total_bruto, total_com_bdi: totals.total_com_bdi };
}
