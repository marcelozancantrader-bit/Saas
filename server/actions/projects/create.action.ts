"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrg } from "@/server/services/current-org";
import { projectSchema } from "@/lib/validators/projects.schema";
import { captureServer } from "@/lib/observability/posthog";

export type CreateProjectResult =
  | { ok: true; id: string }
  | { ok: false; error: string }
  | { ok: false; fieldErrors: Record<string, string[]> };

export async function createProjectAction(formData: FormData): Promise<CreateProjectResult> {
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

  const { orgId, userId } = await getCurrentOrg();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("projects")
    .insert({ org_id: orgId, ...parsed.data })
    .select("id")
    .single();

  if (error || !data) {
    return { ok: false, error: error?.message ?? "Não foi possível criar o projeto." };
  }

  void captureServer({
    event: "project.created",
    distinctId: userId,
    orgId,
    properties: {
      project_id: data.id,
      tipologia: parsed.data.tipologia,
      padrao_construtivo: parsed.data.padrao_construtivo ?? null,
      has_client: !!parsed.data.client_id,
    },
  });

  revalidatePath("/projetos");
  return { ok: true, id: data.id };
}
