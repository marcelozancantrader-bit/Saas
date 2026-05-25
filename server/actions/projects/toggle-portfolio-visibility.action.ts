"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrg } from "@/server/services/current-org";

const schema = z.object({
  project_id: z.string().uuid(),
  visible: z.boolean(),
});

export type TogglePortfolioVisibilityInput = z.infer<typeof schema>;
export type TogglePortfolioVisibilityResult =
  | { ok: true; visible: boolean }
  | { ok: false; error: string };

/**
 * Liga/desliga `projects.portfolio_visible`. O efeito final no portfólio público
 * ainda depende de `organizations.portfolio_enabled` (master switch) — o card
 * em `/configuracoes` controla esse flag.
 *
 * Só owner/admin pode publicar. RLS de update protege org boundary.
 */
export async function togglePortfolioVisibilityAction(
  raw: TogglePortfolioVisibilityInput,
): Promise<TogglePortfolioVisibilityResult> {
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Dados inválidos." };

  const supabase = await createClient();
  const me = await getCurrentOrg();
  if (me.role !== "owner" && me.role !== "admin") {
    return { ok: false, error: "Só owner ou admin pode publicar no portfólio." };
  }

  const { error } = await supabase
    .from("projects")
    .update({
      portfolio_visible: parsed.data.visible,
      updated_at: new Date().toISOString(),
    })
    .eq("id", parsed.data.project_id);

  if (error) return { ok: false, error: error.message };

  revalidatePath(`/projetos/${parsed.data.project_id}`);
  return { ok: true, visible: parsed.data.visible };
}
