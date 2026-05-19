"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrg } from "@/server/services/current-org";
import { isValidCpfOrCnpj } from "@/lib/validators/cpf-cnpj";

const corHexRegex = /^#?[0-9a-fA-F]{6}$/;

const schema = z.object({
  name: z.string().min(1).max(120),
  // Campo armazena CPF (11 dígitos) ou CNPJ (14 dígitos). Aceita vazio.
  // O nome da coluna no banco continua sendo `cnpj` por compatibilidade.
  cnpj: z
    .string()
    .trim()
    .max(20)
    .refine((v) => v === "" || isValidCpfOrCnpj(v), {
      message: "CPF ou CNPJ inválido.",
    })
    .optional()
    .or(z.literal("")),
  registro_cau: z.string().trim().max(40).optional().or(z.literal("")),
  registro_crea: z.string().trim().max(40).optional().or(z.literal("")),
  cor_primaria: z
    .string()
    .trim()
    .refine((v) => v === "" || corHexRegex.test(v), {
      message: "Cor deve ser hex (ex: #1a1a1a).",
    })
    .optional()
    .or(z.literal("")),
  bdi_padrao: z
    .number()
    .nonnegative()
    .lte(200, "BDI parece alto demais (max 200%).")
    .optional()
    .nullable(),
  logo_url: z
    .string()
    .trim()
    .max(500)
    .refine((v) => v === "" || /^https?:\/\//.test(v), {
      message: "URL inválida (deve começar com http:// ou https://).",
    })
    .optional()
    .or(z.literal("")),
  pix_tipo: z.enum(["", "cpf", "cnpj", "email", "telefone", "aleatoria"]).optional(),
  pix_chave: z.string().trim().max(200).optional().or(z.literal("")),
});

export type UpdateOrganizationInput = z.infer<typeof schema>;
export type UpdateOrganizationResult = { ok: true } | { ok: false; error: string };

export async function updateOrganizationAction(
  raw: UpdateOrganizationInput,
): Promise<UpdateOrganizationResult> {
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Dados inválidos.",
    };
  }

  const me = await getCurrentOrg();
  if (me.role !== "owner" && me.role !== "admin") {
    return { ok: false, error: "Só owner ou admin pode editar o workspace." };
  }

  const supabase = await createClient();

  // dados_pix vira null se sem chave; senão objeto.
  const pixTipo = parsed.data.pix_tipo;
  const dadosPix =
    pixTipo && pixTipo.length > 0 && parsed.data.pix_chave
      ? { tipo: pixTipo, chave: parsed.data.pix_chave }
      : null;

  // Cor: normaliza sem # → com #
  const cor =
    parsed.data.cor_primaria && parsed.data.cor_primaria !== ""
      ? parsed.data.cor_primaria.startsWith("#")
        ? parsed.data.cor_primaria
        : `#${parsed.data.cor_primaria}`
      : null;

  // Persiste só os dígitos (mais fácil pra integrar com Asaas e re-mascarar na UI).
  const cnpjDigits = parsed.data.cnpj ? parsed.data.cnpj.replace(/\D+/g, "") : "";

  const { error } = await supabase
    .from("organizations")
    .update({
      name: parsed.data.name,
      cnpj: cnpjDigits || null,
      registro_cau: parsed.data.registro_cau || null,
      registro_crea: parsed.data.registro_crea || null,
      logo_url: parsed.data.logo_url || null,
      cor_primaria: cor,
      bdi_padrao: parsed.data.bdi_padrao ?? null,
      dados_pix: dadosPix,
      updated_at: new Date().toISOString(),
    })
    .eq("id", me.orgId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/configuracoes");
  revalidatePath("/");
  return { ok: true };
}
