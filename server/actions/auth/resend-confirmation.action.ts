"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { env } from "@/lib/validators/env";
import { checkRateLimit } from "@/lib/ratelimit/check";
import { getRequestIp } from "@/lib/ratelimit/ip";

const schema = z.object({
  email: z.string().email(),
});

export type ResendConfirmationResult = { ok: true } | { ok: false; error: string };

/**
 * Reenvia o e-mail de confirmação de signup. Sempre retorna ok=true
 * (mesmo se rate-limit ou e-mail inexistente) pra evitar enumeração.
 */
export async function resendConfirmationAction(
  raw: z.infer<typeof schema>,
): Promise<ResendConfirmationResult> {
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "E-mail inválido." };

  const ip = await getRequestIp();
  const rl = await checkRateLimit({
    key: `resend-confirm:${ip}`,
    limit: 5,
    windowMs: 60 * 60 * 1000,
  });
  if (!rl.ok) return { ok: true };

  const supabase = await createClient();
  await supabase.auth.resend({
    type: "signup",
    email: parsed.data.email,
    options: {
      emailRedirectTo: `${env.NEXT_PUBLIC_APP_URL}/auth/callback`,
    },
  });

  return { ok: true };
}
