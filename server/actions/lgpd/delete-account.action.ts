"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { deleteUserAccount } from "@/server/services/lgpd-delete";

const schema = z.object({
  confirm_text: z.string(),
});

export type DeleteAccountResult = { ok: false; error: string };

/**
 * Action de "deletar minha conta" (LGPD art. 18, VI).
 *
 * Validações:
 *  - Usuário autenticado
 *  - Confirma_text deve ser exatamente "DELETAR MINHA CONTA" (case-sensitive,
 *    em português, evita cliques acidentais e força confirmação consciente).
 *
 * Em sucesso, faz redirect para /login?deleted=1.
 */
export async function deleteAccountAction(
  raw: z.infer<typeof schema>,
): Promise<DeleteAccountResult | never> {
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Dados inválidos." };
  if (parsed.data.confirm_text !== "DELETAR MINHA CONTA") {
    return {
      ok: false,
      error: 'Digite exatamente "DELETAR MINHA CONTA" para confirmar.',
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sessão expirada." };

  const r = await deleteUserAccount(user.id);
  if (!r.ok) return { ok: false, error: r.error };

  // Encerra sessão (já que o usuário foi deletado no Auth).
  await supabase.auth.signOut();
  redirect("/login?deleted=1");
}
