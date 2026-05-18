"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentOrg } from "@/server/services/current-org";
import { DEMO_CLIENT, DEMO_PROJECT, DEMO_EXTRACAO_PLANTA, DEMO_DOCS } from "@/lib/demo/seed-data";

export type CreateDemoResult = { ok: true; project_id: string } | { ok: false; error: string };

/**
 * Cria um projeto demonstração completo (cliente + projeto + extração
 * confirmada + 4 documentos prontos + briefing preenchido) na org atual.
 * Bypassa custo de IA porque os documentos são curated em seed-data.ts.
 *
 * Retorna o project_id pra navegação client-side.
 */
export async function createDemoProjectAction(): Promise<CreateDemoResult> {
  const supabase = await createClient();
  const me = await getCurrentOrg();

  // 1. Cria cliente demo (sempre novo — assim cada demo tem portal_token único)
  const { data: client, error: clientErr } = await supabase
    .from("clients")
    .insert({
      org_id: me.orgId,
      ...DEMO_CLIENT,
    })
    .select("id")
    .single();
  if (clientErr || !client) {
    return { ok: false, error: clientErr?.message ?? "Falha ao criar cliente demo." };
  }

  // 2. Cria projeto demo com extração já confirmada no meta
  const { data: project, error: projectErr } = await supabase
    .from("projects")
    .insert({
      org_id: me.orgId,
      client_id: client.id,
      ...DEMO_PROJECT,
      meta: { extracao_planta: DEMO_EXTRACAO_PLANTA },
    })
    .select("id")
    .single();
  if (projectErr || !project) {
    return { ok: false, error: projectErr?.message ?? "Falha ao criar projeto demo." };
  }

  // 3. Cria os 4 documentos via service-role (bypass RLS pra inserir todos rápido)
  const admin = createAdminClient();
  const docsToInsert = DEMO_DOCS.map((d) => ({
    project_id: project.id,
    tipo: d.tipo,
    versao: 1,
    titulo: d.titulo,
    conteudo_tiptap: d.conteudo_tiptap,
    status: "rascunho",
    prompt_versao: d.prompt_versao,
    custo_tokens: { usd_cost: 0, demo: true },
  }));
  const { error: docsErr } = await admin.from("documents").insert(docsToInsert);
  if (docsErr) {
    return { ok: false, error: `Falha ao criar docs demo: ${docsErr.message}` };
  }

  // 4. Cria um briefing preenchido pra mostrar o ciclo completo
  await admin.from("briefings").insert({
    project_id: project.id,
    status: "preenchido",
    enviado_em: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    preenchido_em: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    respostas: {
      tipo_obra: "construcao_nova",
      quartos: 3,
      banheiros: 2,
      suites: 1,
      vagas_garagem: 2,
      ambientes_especiais: ["Churrasqueira", "Quintal grande", "Closet master"],
      estilo_preferido: "contemporaneo",
      orcamento_estimado: "500_800k",
      prazo_desejado_meses: 10,
      moradores: "casal + 2 filhos pequenos",
      tem_pets: true,
      pets_detalhes: "1 cachorro médio que adora quintal",
      restricoes: "Lote 12x30m em declive suave de 5%. Vizinhança consolidada.",
      inspiracoes:
        "Casas térreas contemporâneas com pé-direito duplo na sala. Linhas retas, telhado embutido.",
      observacoes: "Casal trabalha em home office — espaço pra 2 mesas no escritório.",
    },
  });

  revalidatePath("/");
  revalidatePath("/projetos");
  return { ok: true, project_id: project.id as string };
}
