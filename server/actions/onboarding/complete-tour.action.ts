"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrg } from "@/server/services/current-org";

export type CompleteTourResult = { ok: true } | { ok: false; error: string };

/**
 * Marca o tour guiado como completado pra org atual. Persistido em
 * organizations.meta.onboarding.tour_completed_at. Tour não volta a aparecer
 * em outros logins/devices.
 */
export async function completeOnboardingTourAction(): Promise<CompleteTourResult> {
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
      tour_completed_at: new Date().toISOString(),
      tour_completed_by: me.userId,
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
