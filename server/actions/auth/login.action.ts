"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { loginSchema } from "@/lib/validators/auth.schema";
import { safeRedirect } from "@/lib/utils/safe-redirect";

export type LoginActionResult = { error: string } | { fieldErrors: Record<string, string[]> };

export async function loginAction(formData: FormData): Promise<LoginActionResult | void> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    next: formData.get("next") ?? undefined,
  });

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    return { error: "E-mail ou senha incorretos." };
  }

  redirect(safeRedirect(parsed.data.next, "/dashboard"));
}
