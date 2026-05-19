"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const schema = z
  .object({
    current_password: z.string().min(1, "Informe sua senha atual"),
    new_password: z
      .string()
      .min(8, "Nova senha precisa ter ao menos 8 caracteres")
      .max(72, "Senha excede 72 caracteres"),
    confirm_password: z.string(),
  })
  .refine((data) => data.new_password === data.confirm_password, {
    message: "Confirmação não bate com a nova senha",
    path: ["confirm_password"],
  })
  .refine((data) => data.current_password !== data.new_password, {
    message: "A nova senha precisa ser diferente da atual",
    path: ["new_password"],
  });

export type ChangePasswordInput = z.infer<typeof schema>;
export type ChangePasswordResult = { ok: true } | { ok: false; error: string };

/**
 * Troca a senha do usuário logado.
 *
 * Valida senha atual via signInWithPassword (sem expor isso ao caller),
 * depois chama updateUser({ password }). Se a senha atual estiver errada,
 * retorna erro genérico (não diferencia "senha errada" pra evitar brute force).
 */
export async function changePasswordAction(
  raw: ChangePasswordInput,
): Promise<ChangePasswordResult> {
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) {
    return { ok: false, error: "Sessão expirada. Faça login novamente." };
  }

  // Valida senha atual fazendo um novo signIn — Supabase não expõe verificação direta.
  const { error: verifyErr } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: parsed.data.current_password,
  });
  if (verifyErr) {
    return { ok: false, error: "Senha atual incorreta." };
  }

  // Atualiza pra nova senha.
  const { error: updateErr } = await supabase.auth.updateUser({
    password: parsed.data.new_password,
  });
  if (updateErr) {
    return { ok: false, error: updateErr.message };
  }

  return { ok: true };
}
