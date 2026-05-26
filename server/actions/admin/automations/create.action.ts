"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { assertPlatformAdminAndGetAdminClient } from "@/lib/auth/platform-admin";
import { TRIGGER_TYPES } from "@/lib/automations/types";

const schema = z.object({
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(500).optional().or(z.literal("")),
  trigger_type: z.enum(TRIGGER_TYPES),
});

export type CreateAutomationResult = { ok: true; id: string } | { ok: false; error: string };

export async function createAutomationAction(
  raw: z.infer<typeof schema>,
): Promise<CreateAutomationResult> {
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Dados inválidos." };

  const { me, supabase } = await assertPlatformAdminAndGetAdminClient();

  // Cria automation com graph contendo só o trigger node (posicionado no canto).
  const triggerNode = {
    id: `trigger-${Date.now()}`,
    type: "trigger",
    position: { x: 80, y: 80 },
    data: {
      kind: "trigger" as const,
      actionType: parsed.data.trigger_type,
      label: parsed.data.trigger_type,
      config: {},
    },
  };

  const { data, error } = await supabase
    .from("admin_automations")
    .insert({
      name: parsed.data.name,
      description: parsed.data.description || null,
      trigger: { type: parsed.data.trigger_type, config: {} },
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
