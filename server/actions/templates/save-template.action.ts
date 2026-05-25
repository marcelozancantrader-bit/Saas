"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrg } from "@/server/services/current-org";
import { getPlanLimits, type PlanId } from "@/lib/plans/limits";
import { denyForUpgrade, type ActionFailure } from "@/lib/billing/upgrade-gate";

const ALLOWED_TIPOS = [
  "memorial",
  "caderno",
  "proposta",
  "contrato",
  "cronograma",
  "memorial_estrutural",
  "memorial_hidrossanitario",
  "memorial_eletrico",
  "ppci",
  "impermeabilizacao",
] as const;

const schema = z.object({
  source_document_id: z.string().uuid(),
  nome: z.string().trim().min(3).max(120),
});

export type SaveTemplateResult = { ok: true; template_id: string } | ActionFailure;

export async function saveDocumentAsTemplateAction(
  raw: z.infer<typeof schema>,
): Promise<SaveTemplateResult> {
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Dados inválidos.",
    };
  }

  const me = await getCurrentOrg();
  const supabase = await createClient();

  // Plan gate: Biblioteca de templates é Pro+
  const { data: orgRow } = await supabase
    .from("organizations")
    .select("plano")
    .eq("id", me.orgId)
    .single<{ plano: PlanId }>();
  const currentPlan = orgRow?.plano ?? "free";
  if (!getPlanLimits(currentPlan).bibliotecaTemplates) {
    return denyForUpgrade({
      feature: "bibliotecaTemplates",
      currentPlan,
      requires: (l) => l.bibliotecaTemplates,
    });
  }

  // Lê o documento fonte (RLS garante que é da org do usuário)
  const { data: doc, error: docErr } = await supabase
    .from("documents")
    .select("id, tipo, conteudo_tiptap")
    .eq("id", parsed.data.source_document_id)
    .single<{ id: string; tipo: string; conteudo_tiptap: Record<string, unknown> }>();
  if (docErr || !doc) {
    return { ok: false, error: "Documento fonte não encontrado." };
  }

  if (!(ALLOWED_TIPOS as readonly string[]).includes(doc.tipo)) {
    return {
      ok: false,
      error: `Tipo "${doc.tipo}" não pode virar template (briefing e aditivo são específicos do projeto).`,
    };
  }

  const { data: inserted, error: insErr } = await supabase
    .from("org_doc_templates")
    .insert({
      org_id: me.orgId,
      tipo: doc.tipo,
      nome: parsed.data.nome,
      conteudo_tiptap: doc.conteudo_tiptap,
      source_document_id: doc.id,
      created_by: me.userId,
    })
    .select("id")
    .single();

  if (insErr || !inserted) {
    return { ok: false, error: insErr?.message ?? "Falha ao salvar template." };
  }

  revalidatePath("/configuracoes");
  return { ok: true, template_id: inserted.id };
}
