"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrg } from "@/server/services/current-org";
import { PRODUCT_NAME } from "@/lib/branding";

const schema = z.object({
  template_id: z.string().uuid(),
  project_id: z.string().uuid(),
});

export type UseTemplateResult = { ok: true; document_id: string } | { ok: false; error: string };

/**
 * Cria novo documento a partir de um template do escritório. Substitui
 * placeholders básicos por dados do projeto/cliente/org.
 *
 * Placeholders suportados (case-sensitive):
 *  {{projeto.nome}}        — projeto.nome
 *  {{cliente.nome}}        — clients.nome
 *  {{cliente.cpf_cnpj}}    — clients.cpf_cnpj
 *  {{org.nome}}            — organizations.name
 *  {{org.profissional}}    — organizations.profissional_nome
 *  {{data.hoje}}           — data atual formato 23 de maio de 2026
 */
export async function applyTemplateAction(raw: z.infer<typeof schema>): Promise<UseTemplateResult> {
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Dados inválidos." };

  const me = await getCurrentOrg();
  const supabase = await createClient();

  // Carrega template + projeto + cliente + org em paralelo
  const [{ data: template }, { data: project }, { data: org }] = await Promise.all([
    supabase
      .from("org_doc_templates")
      .select("id, tipo, nome, conteudo_tiptap, org_id")
      .eq("id", parsed.data.template_id)
      .single<{
        id: string;
        tipo: string;
        nome: string;
        conteudo_tiptap: Record<string, unknown>;
        org_id: string;
      }>(),
    supabase
      .from("projects")
      .select("id, nome, org_id, clients ( nome, cpf_cnpj )")
      .eq("id", parsed.data.project_id)
      .single<{
        id: string;
        nome: string;
        org_id: string;
        clients: { nome: string | null; cpf_cnpj: string | null } | null;
      }>(),
    supabase
      .from("organizations")
      .select("name, profissional_nome")
      .eq("id", me.orgId)
      .single<{ name: string; profissional_nome: string | null }>(),
  ]);

  if (!template) return { ok: false, error: "Template não encontrado." };
  if (!project) return { ok: false, error: "Projeto não encontrado." };
  if (template.org_id !== me.orgId || project.org_id !== me.orgId) {
    return { ok: false, error: "Sem permissão." };
  }

  // Substitui placeholders
  const vars: Record<string, string> = {
    "projeto.nome": project.nome,
    "cliente.nome": project.clients?.nome ?? "[Cliente]",
    "cliente.cpf_cnpj": project.clients?.cpf_cnpj ?? "[CPF/CNPJ]",
    "org.nome": org?.name ?? PRODUCT_NAME,
    "org.profissional": org?.profissional_nome ?? "[Profissional]",
    "data.hoje": new Date().toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    }),
  };
  const renderedContent = substituteVars(template.conteudo_tiptap, vars);

  // Próxima versão do tipo no projeto
  const { data: existing } = await supabase
    .from("documents")
    .select("versao")
    .eq("project_id", parsed.data.project_id)
    .eq("tipo", template.tipo)
    .order("versao", { ascending: false })
    .limit(1);
  const nextVersao = ((existing?.[0]?.versao as number | undefined) ?? 0) + 1;

  const titulo = `${template.nome} — ${project.nome}`;

  const { data: inserted, error: insErr } = await supabase
    .from("documents")
    .insert({
      project_id: parsed.data.project_id,
      tipo: template.tipo,
      versao: nextVersao,
      titulo,
      conteudo_tiptap: renderedContent,
      status: "rascunho",
      prompt_versao: `template:${template.id}`,
    })
    .select("id")
    .single();

  if (insErr || !inserted) {
    return { ok: false, error: insErr?.message ?? "Falha ao criar documento." };
  }

  revalidatePath(`/projetos/${parsed.data.project_id}`);
  revalidatePath(`/projetos/${parsed.data.project_id}/documentos`);
  return { ok: true, document_id: inserted.id };
}

/**
 * Substitui {{var}} pelos valores do dict em qualquer string dentro do JSON
 * (Tiptap doc tem text nodes em vários níveis). Trabalha em deep clone.
 */
function substituteVars(
  content: Record<string, unknown>,
  vars: Record<string, string>,
): Record<string, unknown> {
  const json = JSON.stringify(content);
  const replaced = json.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, key) => {
    const val = vars[key];
    if (val === undefined) return `{{${key}}}`; // mantém pra usuário ver o que faltou
    // Escape pra não quebrar JSON
    return val.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  });
  return JSON.parse(replaced) as Record<string, unknown>;
}
