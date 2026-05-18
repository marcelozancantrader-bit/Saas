"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { projectSchema } from "@/lib/validators/projects.schema";

export type UpdateProjectResult =
  | { ok: true }
  | { ok: false; error: string }
  | { ok: false; fieldErrors: Record<string, string[]> };

export async function updateProjectAction(
  projectId: string,
  formData: FormData,
): Promise<UpdateProjectResult> {
  const parsed = projectSchema.safeParse({
    nome: formData.get("nome"),
    client_id: formData.get("client_id"),
    tipologia: formData.get("tipologia"),
    area_prevista_m2: formData.get("area_prevista_m2"),
    padrao_construtivo: formData.get("padrao_construtivo"),
    endereco_cep: formData.get("endereco_cep"),
    endereco_completo: formData.get("endereco_completo"),
    status: formData.get("status") ?? "rascunho",
    cidade_codigo: formData.get("cidade_codigo"),
    zoneamento: formData.get("zoneamento"),
    area_terreno_m2: formData.get("area_terreno_m2"),
  });

  if (!parsed.success) {
    return { ok: false, fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("projects").update(parsed.data).eq("id", projectId);

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath("/projetos");
  revalidatePath(`/projetos/${projectId}`);
  return { ok: true };
}
