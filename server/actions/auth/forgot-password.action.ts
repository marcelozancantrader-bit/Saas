"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { env } from "@/lib/validators/env";

const schema = z.object({
  email: z.string().email("E-mail inválido"),
});

export type ForgotPasswordResult =
  | { ok: true }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

/**
 * Envia e-mail de reset de senha via Supabase Auth.
 * Sempre retorna ok=true (mesmo se e-mail não existe) pra evitar enumeração de contas.
 */
export async function forgotPasswordAction(formData: FormData): Promise<ForgotPasswordResult> {
  const parsed = schema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return { ok: false, error: "E-mail inválido", fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const redirectTo = `${env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/reset-password`;

  await supabase.auth.resetPasswordForEmail(parsed.data.email, { redirectTo });

  // Sempre ok pra não vazar quem tem conta
  return { ok: true };
}
