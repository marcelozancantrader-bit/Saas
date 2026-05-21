"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signupSchema } from "@/lib/validators/auth.schema";
import { env } from "@/lib/validators/env";
import { checkRateLimit, rateLimitError } from "@/lib/ratelimit/check";
import { getRequestIp } from "@/lib/ratelimit/ip";
import { verifyTurnstile } from "@/lib/captcha/turnstile";

export type SignupActionResult = { error: string } | { fieldErrors: Record<string, string[]> };

export async function signupAction(formData: FormData): Promise<SignupActionResult | void> {
  const parsed = signupSchema.safeParse({
    nome_completo: formData.get("nome_completo"),
    email: formData.get("email"),
    password: formData.get("password"),
    nome_escritorio: formData.get("nome_escritorio"),
    lgpd_consent: formData.get("lgpd_consent"),
  });

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const ip = await getRequestIp();

  const captcha = await verifyTurnstile(formData.get("cf_turnstile_token")?.toString(), ip);
  if (!captcha.ok) return { error: captcha.error };

  const rl = await checkRateLimit({
    key: `signup:${ip}`,
    limit: 5,
    windowMs: 60 * 60 * 1000,
  });
  if (!rl.ok) return { error: rateLimitError(rl.retryAfterSeconds) };

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: `${env.NEXT_PUBLIC_APP_URL}/auth/callback`,
      data: {
        full_name: parsed.data.nome_completo,
        org_name: parsed.data.nome_escritorio,
        lgpd_consent_at: new Date().toISOString(),
      },
    },
  });

  if (error) {
    if (error.message.toLowerCase().includes("already registered")) {
      return { error: "Este e-mail já está cadastrado. Faça login." };
    }
    return { error: "Não foi possível concluir o cadastro. Tente novamente." };
  }

  redirect("/login?confirm=1");
}
