"use server";

import { revalidatePath } from "next/cache";
import Big from "big.js";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { recomputeBudgetTotals } from "./update-item.action";

const addItemSchema = z.object({
  budget_id: z.string().uuid(),
  codigo: z.string().min(1),
  descricao: z.string().min(1),
  unidade: z.string().min(1).max(10),
  quantidade: z.coerce.number().positive(),
  preco_unitario: z.coerce.number().nonnegative(),
  origem: z.enum(["sinapi", "custom", "composicao_propria"]).default("custom"),
});

export type AddItemInput = z.infer<typeof addItemSchema>;

export type AddItemResult = { ok: true; item_id: string } | { ok: false; error: string };

export async function addBudgetItemAction(raw: AddItemInput): Promise<AddItemResult> {
  const parsed = addItemSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Dados inválidos." };

  const supabase = await createClient();

  // Compute next ordem
  const { data: existing } = await supabase
    .from("budget_items")
    .select("ordem")
    .eq("budget_id", parsed.data.budget_id)
    .order("ordem", { ascending: false })
    .limit(1);
  const nextOrdem = ((existing?.[0]?.ordem as number | undefined) ?? 0) + 1;

  const { data, error } = await supabase
    .from("budget_items")
    .insert({
      budget_id: parsed.data.budget_id,
      ordem: nextOrdem,
      composicao_codigo: parsed.data.codigo,
      descricao: parsed.data.descricao,
      unidade: parsed.data.unidade,
      quantidade: new Big(parsed.data.quantidade).toFixed(4),
      preco_unitario: new Big(parsed.data.preco_unitario).toFixed(4),
      origem: parsed.data.origem,
    })
    .select("id")
    .single();

  if (error || !data) return { ok: false, error: error?.message ?? "Falha ao adicionar item." };

  await recomputeBudgetTotals(parsed.data.budget_id);
  revalidatePath(`/projetos`, "layout");
  return { ok: true, item_id: data.id };
}
