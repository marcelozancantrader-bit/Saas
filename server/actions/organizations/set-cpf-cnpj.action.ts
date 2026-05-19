"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrg } from "@/server/services/current-org";
import { isValidCpfOrCnpj } from "@/lib/validators/cpf-cnpj";

const schema = z.object({
  cpf_cnpj: z
    .string()
    .trim()
    .min(11)
    .refine((v) => isValidCpfOrCnpj(v), {
      message: "CPF ou CNPJ inválido.",
    }),
});

export type SetOrgCpfCnpjResult = { ok: true } | { ok: false; error: string };

/**
 * Atualiza só o campo cpf/cnpj da organização. Usado pelo dialog que aparece
 * antes do upgrade pra Asaas quando a org ainda não tem o documento.
 *
 * O nome da coluna no banco é `cnpj`, mas armazena CPF (PF) ou CNPJ (PJ) —
 * a integração Asaas aceita os dois.
 */
export async function setOrgCpfCnpjAction(raw: { cpf_cnpj: string }): Promise<SetOrgCpfCnpjResult> {
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Documento inválido." };
  }

  const me = await getCurrentOrg();
  if (me.role !== "owner" && me.role !== "admin") {
    return { ok: false, error: "Só owner ou admin pode editar o workspace." };
  }

  const supabase = await createClient();
  // Armazena só dígitos (mais fácil pra integrar com Asaas e exibir mascarado)
  const digits = parsed.data.cpf_cnpj.replace(/\D+/g, "");

  const { error } = await supabase
    .from("organizations")
    .update({
      cnpj: digits,
      updated_at: new Date().toISOString(),
    })
    .eq("id", me.orgId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/configuracoes");
  revalidatePath("/billing");
  return { ok: true };
}
