"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrg } from "@/server/services/current-org";
import { clientSchema } from "@/lib/validators/clients.schema";

export type CreateClientResult =
  | { ok: true; id: string }
  | { ok: false; error: string }
  | { ok: false; fieldErrors: Record<string, string[]> };

function pick(formData: FormData, key: string): FormDataEntryValue | null {
  return formData.get(key);
}

export async function createClientAction(formData: FormData): Promise<CreateClientResult> {
  const parsed = clientSchema.safeParse({
    nome: pick(formData, "nome"),
    cpf_cnpj: pick(formData, "cpf_cnpj"),
    email: pick(formData, "email"),
    telefone: pick(formData, "telefone"),
    endereco_cep: pick(formData, "endereco_cep"),
    endereco_logradouro: pick(formData, "endereco_logradouro"),
    endereco_numero: pick(formData, "endereco_numero"),
    endereco_complemento: pick(formData, "endereco_complemento"),
    endereco_bairro: pick(formData, "endereco_bairro"),
    endereco_cidade: pick(formData, "endereco_cidade"),
    endereco_uf: pick(formData, "endereco_uf"),
  });

  if (!parsed.success) {
    return { ok: false, fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const { orgId } = await getCurrentOrg();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("clients")
    .insert({ org_id: orgId, ...parsed.data })
    .select("id")
    .single();

  if (error || !data) {
    return { ok: false, error: error?.message ?? "Não foi possível criar o cliente." };
  }

  revalidatePath("/clientes");
  return { ok: true, id: data.id };
}
