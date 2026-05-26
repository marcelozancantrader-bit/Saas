"use server";

import { revalidatePath, updateTag } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { generateDocument, DOCUMENT_LABELS } from "@/lib/ai/generate-document";
import { documentToTiptap } from "@/lib/tiptap/from-sections";
import { getCurrentOrg } from "@/server/services/current-org";
import { canGenerateAiDoc, getPlanUsage } from "@/server/services/plan-usage";
import { checkRateLimit, rateLimitError } from "@/lib/ratelimit/check";
import { getContractTemplate } from "@/lib/contract-templates/templates";
import { captureServer } from "@/lib/observability/posthog";
import { getPlanLimits, type PlanId } from "@/lib/plans/limits";
import { denyForUpgrade, type ActionFailure } from "@/lib/billing/upgrade-gate";
import { publishAdminEvent } from "@/lib/automations/publish";

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
  /** ID do template (somente quando tipo === "contrato"). */
  contract_template_id: z.string().min(1).max(60).optional(),
});

export type GenerateDocumentActionInput = z.infer<typeof inputSchema>;

export type GenerateDocumentActionResult = { ok: true; document_id: string } | ActionFailure;

export async function generateDocumentAction(
  raw: GenerateDocumentActionInput,
): Promise<GenerateDocumentActionResult> {
  const parsed = inputSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Parâmetros inválidos." };
  const { project_id, tipo, contract_template_id } = parsed.data;

  // Resolve template (somente pra contrato — ignora pra outros tipos)
  const contractTemplate =
    tipo === "contrato" && contract_template_id ? getContractTemplate(contract_template_id) : null;
  if (tipo === "contrato" && contract_template_id && !contractTemplate) {
    return { ok: false, error: "Template de contrato inválido." };
  }

  const supabase = await createClient();

  // Plan gate: limite de templates de contrato por plano.
  // Ordem de templates (do mais básico ao mais completo, ver lib/contract-templates/templates.ts):
  //   1. residencial_pf, 2. residencial_pj_multifamiliar, 3. comercial,
  //   4. reforma_retrofit, 5. projeto_legal, 6. projeto_completo_rt
  if (contractTemplate) {
    const me0 = await getCurrentOrg();
    const { data: orgRow0 } = await supabase
      .from("organizations")
      .select("plano")
      .eq("id", me0.orgId)
      .single<{ plano: PlanId }>();
    const currentPlan0 = orgRow0?.plano ?? "free";
    const tplMax = getPlanLimits(currentPlan0).templatesContratoMax;
    if (tplMax !== null) {
      const TEMPLATE_ORDER = [
        "residencial_pf",
        "residencial_pj_multifamiliar",
        "comercial",
        "reforma_retrofit",
        "projeto_legal",
        "projeto_completo_rt",
      ];
      const idx = TEMPLATE_ORDER.indexOf(contractTemplate.id);
      if (idx >= tplMax) {
        const tplWord = tplMax === 1 ? "template" : "templates";
        return denyForUpgrade({
          feature: "templatesContratoMax",
          currentPlan: currentPlan0,
          requires: (l) => l.templatesContratoMax === null || l.templatesContratoMax > tplMax,
          message: `Este template está disponível em planos superiores. Seu plano libera os primeiros ${tplMax} ${tplWord} de contrato (CAU/CREA).`,
          limit: { used: idx + 1, limit: tplMax, unit: "templates de contrato" },
        });
      }
    }
  }

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
  const currentPlan = orgRow?.plano ?? "free";
  const usage = await getPlanUsage(me.orgId, currentPlan);
  const limitCheck = canGenerateAiDoc(usage);
  if (!limitCheck.ok) {
    const currentMonthly = getPlanLimits(currentPlan).monthlyAiDocs ?? 0;
    return denyForUpgrade({
      feature: "monthlyAiDocs",
      currentPlan,
      requires: (l) => l.monthlyAiDocs === null || l.monthlyAiDocs > currentMonthly,
      message: `${limitCheck.reason} Faça upgrade pra gerar mais documentos neste mês.`,
      limit: { used: limitCheck.used, limit: limitCheck.limit, unit: "documentos IA neste mês" },
    });
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
      templateAddition: contractTemplate?.systemAddition ?? null,
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

  const promptVersaoFinal = contractTemplate
    ? `${result.promptVersion}+${contractTemplate.id}`
    : result.promptVersion;

  const { data: inserted, error: insertErr } = await supabase
    .from("documents")
    .insert({
      project_id,
      tipo,
      versao: nextVersao,
      titulo,
      conteudo_tiptap: tiptap,
      status: "rascunho",
      prompt_versao: promptVersaoFinal,
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
  updateTag("plan-usage");
  updateTag("dashboard-metrics");

  void captureServer({
    event: "document.generated",
    distinctId: me.userId,
    orgId: me.orgId,
    properties: {
      project_id,
      document_id: inserted.id,
      tipo,
      versao: nextVersao,
      contract_template_id: contract_template_id ?? null,
      usd_cost: result.usage.usd_cost ?? null,
      prompt_versao: promptVersaoFinal,
    },
  });

  // Publica pro builder de automações admin
  await publishAdminEvent("document.generated", {
    org_id: me.orgId,
    project_id,
    document_id: inserted.id,
    tipo,
    versao: nextVersao,
    usd_cost: result.usage.usd_cost ?? null,
  });

  return { ok: true, document_id: inserted.id };
}
