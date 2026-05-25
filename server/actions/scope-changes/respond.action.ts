"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({
  scope_change_id: z.string().uuid(),
  decisao: z.enum(["aceitar", "recusar"]),
  // multipleOf 0.01 rejeita valores com 3+ casas decimais (ex: 100.555) que
  // causariam erro de arredondamento. R$ só aceita centavos.
  valor_aditivo: z.number().nonnegative().multipleOf(0.01).nullable().optional(),
  prazo_adicional_dias: z.number().int().nonnegative().nullable().optional(),
  observacoes: z.string().max(2000).optional(),
});

export type RespondScopeChangeInput = z.infer<typeof schema>;
export type RespondScopeChangeResult = { ok: true } | { ok: false; error: string };

/**
 * Profissional responde a uma solicitação de alteração de escopo.
 *   - "aceitar" → status='aguardando_cliente' com valor/prazo (cliente vai aprovar)
 *   - "recusar" → status='recusado', resolvido_em=now()
 */
export async function respondScopeChangeAction(
  raw: RespondScopeChangeInput,
): Promise<RespondScopeChangeResult> {
  const parsed = schema.safeParse(raw);
  if (!parsed.success)
    return { ok: false, error: "Dados inválidos: " + parsed.error.issues[0]!.message };

  const supabase = await createClient();

  const updates =
    parsed.data.decisao === "aceitar"
      ? {
          status: "aguardando_cliente",
          valor_aditivo: parsed.data.valor_aditivo ?? null,
          prazo_adicional_dias: parsed.data.prazo_adicional_dias ?? null,
        }
      : {
          status: "recusado",
          resolvido_em: new Date().toISOString(),
        };

  const { data, error } = await supabase
    .from("scope_changes")
    .update(updates)
    .eq("id", parsed.data.scope_change_id)
    .eq("status", "pendente_analise")
    .select("project_id")
    .single();
  if (error || !data) return { ok: false, error: error?.message ?? "Falha ao atualizar." };

  revalidatePath(`/projetos/${data.project_id}`);
  return { ok: true };
}
