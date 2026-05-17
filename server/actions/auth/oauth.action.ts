"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { env } from "@/lib/validators/env";

export type OAuthProvider = "google";

export async function signInWithOAuthAction(provider: OAuthProvider) {
  if (provider === "google" && !env.NEXT_PUBLIC_GOOGLE_OAUTH_ENABLED) {
    return { error: "Login com Google está temporariamente desabilitado." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${env.NEXT_PUBLIC_APP_URL}/auth/callback`,
    },
  });

  if (error || !data.url) {
    return { error: "Não foi possível iniciar o login social. Tente novamente." };
  }

  redirect(data.url);
}
