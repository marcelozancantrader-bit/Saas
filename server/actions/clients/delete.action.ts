"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type DeleteClientResult = { ok: true } | { ok: false; error: string };

export async function deleteClientAction(clientId: string): Promise<DeleteClientResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("clients").delete().eq("id", clientId);

  if (error) {
    // Common cause: client has projects → FK constraint. We currently SET NULL on project.client_id,
    // so this shouldn't be the case, but surface the message.
    return { ok: false, error: error.message };
  }

  revalidatePath("/clientes");
  redirect("/clientes");
}
