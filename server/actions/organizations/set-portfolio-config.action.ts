"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentOrg } from "@/server/services/current-org";

const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])$/;

const schema = z.object({
  enabled: z.boolean(),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(3, "Mínimo 3 caracteres.")
    .max(40, "Máximo 40 caracteres.")
    .regex(
      SLUG_RE,
      "Use só letras minúsculas, números e hífen. Comece e termine com letra ou número.",
    )
    .nullable(),
});

export type SetPortfolioConfigInput = z.infer<typeof schema>;
export type SetPortfolioConfigResult =
  | { ok: true; slug: string | null; enabled: boolean }
  | { ok: false; error: string };

/**
 * Configura o portfólio público da org (slug + enable). Owner/admin only.
 *
 * Regras:
 *   - Pra enabled=true, slug é obrigatório.
 *   - Slug deve ser único entre orgs (case-insensitive).
 *   - Trocar o slug é OK mas QUEBRA links antigos — avisar usuário no UI.
 */
export async function setPortfolioConfigAction(
  raw: SetPortfolioConfigInput,
): Promise<SetPortfolioConfigResult> {
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { ok: false, error: first?.message ?? "Dados inválidos." };
  }

  const me = await getCurrentOrg();
  if (me.role !== "owner" && me.role !== "admin") {
    return { ok: false, error: "Só owner ou admin pode configurar o portfólio." };
  }

  if (parsed.data.enabled && !parsed.data.slug) {
    return { ok: false, error: "Defina um slug antes de ativar o portfólio." };
  }

  // Checa unicidade case-insensitive (excluindo a própria org).
  if (parsed.data.slug) {
    const supabase = await createClient();
    const { data: conflict } = await supabase
      .from("organizations")
      .select("id")
      .ilike("portfolio_slug", parsed.data.slug)
      .neq("id", me.orgId)
      .maybeSingle<{ id: string }>();
    if (conflict) {
      return { ok: false, error: "Esse slug já está em uso por outro escritório." };
    }
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("organizations")
    .update({
      portfolio_slug: parsed.data.slug,
      portfolio_enabled: parsed.data.enabled,
      updated_at: new Date().toISOString(),
    })
    .eq("id", me.orgId);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/configuracoes");
  return { ok: true, slug: parsed.data.slug, enabled: parsed.data.enabled };
}
