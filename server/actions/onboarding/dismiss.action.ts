"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrg } from "@/server/services/current-org";

export type DismissOnboardingResult = { ok: true } | { ok: false; error: string };

/**
 * Marca o onboarding checklist como dispensado pra org atual. Persistido em
 * organizations.meta.onboarding.dismissed_at — sobrevive a trocar de máquina
 * ou navegador. Não bloqueia que o checklist volte a aparecer se o usuário
 * reabrir manualmente (não há "des-dismiss" via UI por enquanto).
 */
export async function dismissOnboardingAction(): Promise<DismissOnboardingResult> {
  const me = await getCurrentOrg();
  const supabase = await createClient();

  const { data: orgRow, error: readErr } = await supabase
    .from("organizations")
    .select("meta")
    .eq("id", me.orgId)
    .single<{ meta: Record<string, unknown> | null }>();
  if (readErr) return { ok: false, error: readErr.message };

  const previousMeta = (orgRow?.meta ?? {}) as Record<string, unknown>;
  const previousOnboarding = (previousMeta.onboarding as Record<string, unknown> | undefined) ?? {};

  const newMeta = {
    ...previousMeta,
    onboarding: {
      ...previousOnboarding,
      dismissed_at: new Date().toISOString(),
      dismissed_by: me.userId,
    },
  };

  const { error: updErr } = await supabase
    .from("organizations")
    .update({ meta: newMeta, updated_at: new Date().toISOString() })
    .eq("id", me.orgId);
  if (updErr) return { ok: false, error: updErr.message };

  revalidatePath("/dashboard");
  return { ok: true };
}
