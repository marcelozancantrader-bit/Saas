"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({
  full_name: z.string().trim().min(2, "Informe seu nome completo").max(120, "Nome muito longo"),
});

export type UpdateProfileResult = { ok: true } | { ok: false; error: string };

/**
 * Atualiza nome do usuário (auth.users.raw_user_meta_data.full_name).
 * Não troca e-mail nem senha — actions separadas.
 */
export async function updateProfileAction(raw: {
  full_name: string;
}): Promise<UpdateProfileResult> {
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sessão expirada. Faça login novamente." };

  const { error } = await supabase.auth.updateUser({
    data: {
      ...(user.user_metadata ?? {}),
      full_name: parsed.data.full_name,
    },
  });

  if (error) return { ok: false, error: error.message };

  revalidatePath("/configuracoes");
  return { ok: true };
}
