"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { clientSchema } from "@/lib/validators/clients.schema";

export type UpdateClientResult =
  | { ok: true }
  | { ok: false; error: string }
  | { ok: false; fieldErrors: Record<string, string[]> };

export async function updateClientAction(
  clientId: string,
  formData: FormData,
): Promise<UpdateClientResult> {
  const parsed = clientSchema.safeParse({
    nome: formData.get("nome"),
    cpf_cnpj: formData.get("cpf_cnpj"),
    email: formData.get("email"),
    telefone: formData.get("telefone"),
    endereco_cep: formData.get("endereco_cep"),
    endereco_logradouro: formData.get("endereco_logradouro"),
    endereco_numero: formData.get("endereco_numero"),
    endereco_complemento: formData.get("endereco_complemento"),
    endereco_bairro: formData.get("endereco_bairro"),
    endereco_cidade: formData.get("endereco_cidade"),
    endereco_uf: formData.get("endereco_uf"),
  });

  if (!parsed.success) {
    return { ok: false, fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("clients").update(parsed.data).eq("id", clientId);

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath("/clientes");
  revalidatePath(`/clientes/${clientId}`);
  return { ok: true };
}
