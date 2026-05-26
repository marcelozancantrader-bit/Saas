"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { assertPlatformAdminAndGetAdminClient } from "@/lib/auth/platform-admin";
import { TRIGGER_TYPES } from "@/lib/automations/types";
import { findRecipeById, instantiateRecipeGraph } from "@/lib/automations/recipes";

const schema = z
  .object({
    name: z.string().trim().min(2).max(120),
    description: z.string().trim().max(500).optional().or(z.literal("")),
    trigger_type: z.enum(TRIGGER_TYPES).optional(),
    /** Se passado, ignora trigger_type e usa graph completo da recipe. */
    recipe_id: z.string().min(1).max(80).optional(),
  })
  .refine((d) => d.trigger_type || d.recipe_id, {
    message: "Forneça trigger_type ou recipe_id.",
  });

export type CreateAutomationResult = { ok: true; id: string } | { ok: false; error: string };

export async function createAutomationAction(
  raw: z.infer<typeof schema>,
): Promise<CreateAutomationResult> {
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const { me, supabase } = await assertPlatformAdminAndGetAdminClient();

  // Caminho 1: recipe pré-pronta
  if (parsed.data.recipe_id) {
    const recipe = findRecipeById(parsed.data.recipe_id);
    if (!recipe) return { ok: false, error: "Recipe não encontrada." };

    const suffix = crypto.randomUUID().slice(0, 8);
    const graph = instantiateRecipeGraph(recipe.graph, suffix);

    const { data, error } = await supabase
      .from("admin_automations")
      .insert({
        name: parsed.data.name,
        description: parsed.data.description || recipe.description,
        trigger: recipe.trigger,
        graph,
        enabled: false,
        created_by: me.id,
      })
      .select("id")
      .single();

    if (error || !data) return { ok: false, error: error?.message ?? "Falha ao criar." };
    revalidatePath("/admin/automacoes");
    return { ok: true, id: data.id as string };
  }

  // Caminho 2: do zero — só trigger node
  const triggerNode = {
    id: `trigger-${crypto.randomUUID().slice(0, 8)}`,
    type: "trigger",
    position: { x: 80, y: 80 },
    data: {
      kind: "trigger" as const,
      actionType: parsed.data.trigger_type!,
      label: parsed.data.trigger_type!,
      config: {},
    },
  };

  const { data, error } = await supabase
    .from("admin_automations")
    .insert({
      name: parsed.data.name,
      description: parsed.data.description || null,
      trigger: { type: parsed.data.trigger_type!, config: {} },
      graph: { nodes: [triggerNode], edges: [] },
      enabled: false,
      created_by: me.id,
    })
    .select("id")
    .single();

  if (error || !data) {
    return { ok: false, error: error?.message ?? "Falha ao criar automation." };
  }

  revalidatePath("/admin/automacoes");
  return { ok: true, id: data.id as string };
}
