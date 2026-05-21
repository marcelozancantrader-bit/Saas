"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";
import { assertPlatformAdminAndGetAdminClient } from "@/lib/auth/platform-admin";

const schema = z.object({
  uf: z
    .string()
    .length(2)
    .transform((v) => v.toUpperCase()),
  padrao: z.enum(["popular", "medio", "alto", "luxo"]),
  mes_referencia: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  faixa_min: z.coerce.number().positive().finite(),
  faixa_max: z.coerce.number().positive().finite(),
  fonte: z.string().trim().max(200).optional().nullable(),
});

export type UpsertCubInput = z.input<typeof schema>;
export type UpsertCubResult = { ok: true } | { ok: false; error: string };

/**
 * Cria ou atualiza uma faixa CUB em (uf × padrao × mes_referencia).
 * Unique index na tabela trata conflito como update.
 */
export async function upsertCubAction(raw: UpsertCubInput): Promise<UpsertCubResult> {
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }
  const data = parsed.data;

  if (data.faixa_min >= data.faixa_max) {
    return { ok: false, error: "Faixa mínima precisa ser menor que a máxima." };
  }

  const { me, supabase } = await assertPlatformAdminAndGetAdminClient();

  const { error } = await supabase.from("cub_estadual").upsert(
    {
      uf: data.uf,
      padrao: data.padrao,
      mes_referencia: data.mes_referencia,
      faixa_min: data.faixa_min,
      faixa_max: data.faixa_max,
      fonte: data.fonte ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "uf,padrao,mes_referencia" },
  );

  if (error) return { ok: false, error: error.message };

  const h = await headers();
  await supabase.from("audit_log").insert({
    actor_id: me.id,
    actor_type: "platform_admin",
    action: "cub.upsert",
    entity_type: "cub_estadual",
    payload: { ...data, admin_email: me.email },
    ip: h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    user_agent: h.get("user-agent") ?? null,
  });

  revalidatePath("/admin/cub");
  return { ok: true };
}
