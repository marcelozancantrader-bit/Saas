"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const schema = z
  .object({
    new_password: z
      .string()
      .min(8, "Senha precisa ter ao menos 8 caracteres")
      .max(72, "Senha excede 72 caracteres"),
    confirm_password: z.string(),
  })
  .refine((data) => data.new_password === data.confirm_password, {
    message: "Confirmação não bate com a nova senha",
    path: ["confirm_password"],
  });

export type ResetPasswordResult =
  | { ok: true }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

/**
 * Define nova senha pra usuário que veio do magic link de reset.
 * O magic link já estabeleceu sessão temporária; updateUser usa essa sessão.
 */
export async function resetPasswordAction(formData: FormData): Promise<ResetPasswordResult> {
  const parsed = schema.safeParse({
    new_password: formData.get("new_password"),
    confirm_password: formData.get("confirm_password"),
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Dados inválidos",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      ok: false,
      error: "Link expirado ou inválido. Solicite um novo em /forgot-password.",
    };
  }

  const { error } = await supabase.auth.updateUser({ password: parsed.data.new_password });
  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true };
}
