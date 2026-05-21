"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { generateDocument, DOCUMENT_LABELS } from "@/lib/ai/generate-document";
import { documentToTiptap } from "@/lib/tiptap/from-sections";
import { getCurrentOrg } from "@/server/services/current-org";
import { canGenerateAiDoc, getPlanUsage } from "@/server/services/plan-usage";
import { checkRateLimit, rateLimitError } from "@/lib/ratelimit/check";
import type { PlanId } from "@/lib/plans/limits";

const inputSchema = z.object({
  project_id: z.string().uuid(),
  tipo: z.enum([
    "memorial",
    "caderno",
    "proposta",
    "contrato",
    "memorial_estrutural",
    "memorial_hidrossanitario",
    "memorial_eletrico",
    "ppci",
    "impermeabilizacao",
    "cronograma",
  ]),
});

export type GenerateDocumentActionInput = z.infer<typeof inputSchema>;

export type GenerateDocumentActionResult =
  | { ok: true; document_id: string }
  | { ok: false; error: string };

export async function generateDocumentAction(
  raw: GenerateDocumentActionInput,
): Promise<GenerateDocumentActionResult> {
  const parsed = inputSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Parâmetros inválidos." };
  const { project_id, tipo } = parsed.data;

  const supabase = await createClient();

  // Fetch project + client + extraction
  const { data: project, error: projErr } = await supabase
    .from("projects")
    .select(
      "id, nome, tipologia, area_prevista_m2, padrao_construtivo, endereco_completo, meta, clients ( nome, cpf_cnpj, email )",
    )
    .eq("id", project_id)
    .single<{
      id: string;
      nome: string;
      tipologia: string;
      area_prevista_m2: number | null;
      padrao_construtivo: string | null;
      endereco_completo: string | null;
      meta: Record<string, unknown> | null;
      clients: { nome: string | null; cpf_cnpj: string | null; email: string | null } | null;
    }>();

  if (projErr || !project) {
    return { ok: false, error: "Projeto não encontrado ou sem permissão." };
  }

  // Plan limit: monthly AI docs.
  const me = await getCurrentOrg();

  // Burst protection: cap por hora pra evitar abuso/loop acidental
  // (limite mensal do plano ainda se aplica em paralelo).
  const burst = await checkRateLimit({
    key: `ai-doc:${me.orgId}`,
    limit: 15,
    windowMs: 60 * 60 * 1000,
  });
  if (!burst.ok) return { ok: false, error: rateLimitError(burst.retryAfterSeconds) };

  const { data: orgRow } = await supabase
    .from("organizations")
    .select("plano")
    .eq("id", me.orgId)
    .single<{ plano: PlanId }>();
  const usage = await getPlanUsage(me.orgId, orgRow?.plano ?? "free");
  const limitCheck = canGenerateAiDoc(usage);
  if (!limitCheck.ok) {
    return {
      ok: false,
      error: `${limitCheck.reason} Faça upgrade do plano em /billing para gerar mais documentos.`,
    };
  }

  const extracao =
    (project.meta?.extracao_planta as
      | {
          confirmed_by_user?: boolean;
          area_total_m2?: number | null;
          numero_pavimentos?: number | null;
          ambientes?: Array<{ nome: string; area_m2: number | null; tipo: string }>;
          elementos_especiais?: {
            piscina: boolean;
            churrasqueira: boolean;
            sacada: boolean;
            garagem: boolean;
            jardim: boolean;
            area_servico_externa: boolean;
          };
          observacoes?: string | null;
          confianca?: "alta" | "media" | "baixa" | null;
        }
      | undefined) ?? null;

  // Docs técnicos que precisam da extração confirmada da planta:
  const REQUIRES_EXTRACTION: ReadonlySet<string> = new Set([
    "memorial",
    "caderno",
    "memorial_estrutural",
    "memorial_hidrossanitario",
    "memorial_eletrico",
    "ppci",
    "impermeabilizacao",
  ]);
  if (REQUIRES_EXTRACTION.has(tipo) && !extracao?.confirmed_by_user) {
    return {
      ok: false,
      error: `Para gerar ${DOCUMENT_LABELS[tipo]}, confirme primeiro a extração da planta na aba do projeto.`,
    };
  }

  // Docs comerciais precisam do cliente cadastrado (nome do contratante é peça central)
  const REQUIRES_CLIENT: ReadonlySet<string> = new Set(["proposta", "contrato"]);
  if (REQUIRES_CLIENT.has(tipo) && !project.clients?.nome) {
    return {
      ok: false,
      error: `Para gerar ${DOCUMENT_LABELS[tipo]}, vincule um cliente ao projeto primeiro (o nome do cliente é o contratante).`,
    };
  }

  // Call the AI
  const result = await generateDocument(
    {
      tipo,
      context: {
        project: {
          nome: project.nome,
          tipologia: project.tipologia,
          area_prevista_m2: project.area_prevista_m2,
          padrao_construtivo: project.padrao_construtivo,
          endereco_completo: project.endereco_completo,
        },
        client: project.clients,
        extracao_planta:
          extracao && extracao.confirmed_by_user
            ? {
                area_total_m2: extracao.area_total_m2 ?? null,
                numero_pavimentos: extracao.numero_pavimentos ?? null,
                ambientes: extracao.ambientes ?? [],
                elementos_especiais: extracao.elementos_especiais ?? {
                  piscina: false,
                  churrasqueira: false,
                  sacada: false,
                  garagem: false,
                  jardim: false,
                  area_servico_externa: false,
                },
                observacoes: extracao.observacoes ?? null,
                confianca: extracao.confianca ?? null,
              }
            : null,
      },
    },
    { timeoutMs: 290_000 },
  );

  if (!result.ok) {
    return { ok: false, error: `${result.error}${result.detail ? ` (${result.detail})` : ""}` };
  }

  // Convert sections → Tiptap JSON
  const tiptap = documentToTiptap(result.document);

  // Next version for this (project_id, tipo)
  const { data: existing } = await supabase
    .from("documents")
    .select("versao")
    .eq("project_id", project_id)
    .eq("tipo", tipo)
    .order("versao", { ascending: false })
    .limit(1);
  const nextVersao = ((existing?.[0]?.versao as number | undefined) ?? 0) + 1;

  const titulo = result.document.titulo;

  const { data: inserted, error: insertErr } = await supabase
    .from("documents")
    .insert({
      project_id,
      tipo,
      versao: nextVersao,
      titulo,
      conteudo_tiptap: tiptap,
      status: "rascunho",
      prompt_versao: result.promptVersion,
      custo_tokens: result.usage,
    })
    .select("id")
    .single();

  if (insertErr || !inserted) {
    return {
      ok: false,
      error: `Falha ao salvar o documento: ${insertErr?.message ?? "desconhecido"}`,
    };
  }

  revalidatePath(`/projetos/${project_id}`);
  revalidatePath(`/projetos/${project_id}/documentos`);

  return { ok: true, document_id: inserted.id };
}
