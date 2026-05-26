"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { assertPlatformAdminAndGetAdminClient } from "@/lib/auth/platform-admin";
import { automationGraphSchema, triggerSchema } from "@/lib/automations/types";

const importSchema = z.object({
  /** JSON exportado por outra automation. Esperado: { name, description, trigger, graph }. */
  payload: z.string().min(2).max(200000),
});

const importedAutomationSchema = z.object({
  name: z.string().trim().min(2).max(120),
  description: z.string().nullable().optional(),
  trigger: triggerSchema,
  graph: automationGraphSchema,
});

export type ImportAutomationResult = { ok: true; id: string } | { ok: false; error: string };

/**
 * Importa automação de um JSON. Renomeia IDs do graph pra evitar colisão
 * caso múltiplas instâncias da mesma exportação sejam importadas.
 */
export async function importAutomationAction(
  raw: z.infer<typeof importSchema>,
): Promise<ImportAutomationResult> {
  const inputParsed = importSchema.safeParse(raw);
  if (!inputParsed.success) return { ok: false, error: "Dados inválidos." };

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(inputParsed.data.payload);
  } catch (e) {
    return {
      ok: false,
      error: `JSON inválido: ${e instanceof Error ? e.message : String(e)}`,
    };
  }

  const parsed = importedAutomationSchema.safeParse(parsedJson);
  if (!parsed.success) {
    return {
      ok: false,
      error: `Estrutura inválida: ${parsed.error.issues[0]?.message ?? "?"}`,
    };
  }

  const { me, supabase } = await assertPlatformAdminAndGetAdminClient();

  // Renomeia IDs do graph com sufixo único.
  const suffix = crypto.randomUUID().slice(0, 8);
  const idMap = new Map<string, string>();
  for (const node of parsed.data.graph.nodes) {
    idMap.set(node.id, `${node.id}-${suffix}`);
  }
  const remappedGraph = {
    nodes: parsed.data.graph.nodes.map((n) => ({
      ...n,
      id: idMap.get(n.id) ?? n.id,
    })),
    edges: parsed.data.graph.edges.map((e) => ({
      ...e,
      id: `${e.id}-${suffix}`,
      source: idMap.get(e.source) ?? e.source,
      target: idMap.get(e.target) ?? e.target,
    })),
  };

  const { data, error } = await supabase
    .from("admin_automations")
    .insert({
      name: parsed.data.name + " (importada)",
      description: parsed.data.description ?? null,
      trigger: parsed.data.trigger,
      graph: remappedGraph,
      enabled: false,
      created_by: me.id,
    })
    .select("id")
    .single();

  if (error || !data) return { ok: false, error: error?.message ?? "Falha ao importar." };

  revalidatePath("/admin/automacoes");
  return { ok: true, id: data.id as string };
}
