"use server";

import { z } from "zod";
import { getAnthropic, ANTHROPIC_MODELS, summarizeUsage } from "@/lib/ai/clients/anthropic";
import { createAdminClient } from "@/lib/supabase/admin";
import { assertPortalAccess } from "@/server/services/portal-loader";
import { checkRateLimit, rateLimitError } from "@/lib/ratelimit/check";
import { captureException } from "@/lib/observability/sentry";

const schema = z.object({
  token: z.string().uuid(),
  project_id: z.string().uuid(),
  question: z.string().min(2).max(2000),
});

export type ChatResult = { ok: true; answer: string } | { ok: false; error: string };

const SYSTEM_PROMPT = `Você é um assistente do escritório de arquitetura/engenharia que está conversando DIRETAMENTE com o cliente final (proprietário da obra). Sua função é explicar o projeto em linguagem simples, NÃO técnica.

REGRAS DURAS:
- O cliente é leigo. Evite jargão (NBR, fck, BDI, m² por aposento) sem traduzir.
- Use 2-3 parágrafos curtos. Frases curtas. Linguagem cordial mas direta.
- Se a pergunta for sobre algo que NÃO está no contexto fornecido, diga "essa informação ainda não foi definida no projeto, pergunte ao seu arquiteto pelo portal".
- NUNCA invente medidas, prazos, valores, ou normas. Use apenas o contexto fornecido.
- Se a pergunta envolver alteração de escopo (cliente quer mudar algo), oriente: "Para mudanças, use o botão 'Solicitar alteração de escopo' no portal — assim seu arquiteto formaliza o aditivo".
- Se a pergunta for sobre quando algo fica pronto, diga que prazos são acordados no contrato e qualquer alteração do prazo passa por aditivo.
- NUNCA fale em nome do arquiteto sobre decisões técnicas que ele não tomou. Use "geralmente em projetos como o seu..." quando dar contexto.

Termine sempre com: "Se quiser detalhar isso com o arquiteto, é só me dizer que registro a pergunta no projeto." (assim convidando à conversação humana quando necessário).`;

export async function portalChatAction(raw: z.infer<typeof schema>): Promise<ChatResult> {
  const parsed = schema.safeParse(raw);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Pergunta inválida." };

  const access = await assertPortalAccess(parsed.data.token, parsed.data.project_id);
  if (!access.ok) return { ok: false, error: "Acesso negado." };

  const rl = await checkRateLimit({
    key: `portal-chat:${parsed.data.token}`,
    limit: 30,
    windowMs: 60 * 60 * 1000,
  });
  if (!rl.ok) return { ok: false, error: rateLimitError(rl.retryAfterSeconds) };

  // Constroi contexto: projeto + extração + briefing + docs já enviados (resumos)
  const admin = createAdminClient();
  const [{ data: project }, { data: briefing }, { data: docs }] = await Promise.all([
    admin
      .from("projects")
      .select(
        "nome, tipologia, area_prevista_m2, padrao_construtivo, endereco_completo, valor_contrato, meta",
      )
      .eq("id", parsed.data.project_id)
      .single(),
    admin
      .from("briefings")
      .select("respostas")
      .eq("project_id", parsed.data.project_id)
      .maybeSingle(),
    admin
      .from("documents")
      .select("tipo, titulo, status, aprovacao_meta")
      .eq("project_id", parsed.data.project_id)
      .not("envio_meta", "is", null),
  ]);

  if (!project) return { ok: false, error: "Projeto não encontrado." };

  const extracao = (project.meta as Record<string, unknown> | null)?.extracao_planta as
    | {
        area_total_m2?: number | null;
        numero_pavimentos?: number | null;
        ambientes?: Array<{ nome: string; area_m2: number | null; tipo: string }>;
        elementos_especiais?: Record<string, boolean>;
      }
    | undefined;

  const contextBlocks: string[] = [];
  contextBlocks.push(
    `## Projeto\n- Nome: ${project.nome}\n- Tipologia: ${project.tipologia}\n- Padrão: ${project.padrao_construtivo ?? "não definido"}\n- Área prevista: ${project.area_prevista_m2 ?? "não definida"} m²\n- Endereço: ${project.endereco_completo ?? "não informado"}\n- Valor do contrato: ${project.valor_contrato ? `R$ ${project.valor_contrato}` : "não definido"}`,
  );

  if (extracao) {
    const lista =
      extracao.ambientes
        ?.map((a) => `${a.nome}${a.area_m2 ? ` (${a.area_m2}m²)` : ""}`)
        .join(", ") ?? "—";
    contextBlocks.push(
      `## Planta confirmada\n- Área total: ${extracao.area_total_m2 ?? "—"} m²\n- Pavimentos: ${extracao.numero_pavimentos ?? "—"}\n- Ambientes: ${lista}`,
    );
  }

  if (briefing?.respostas) {
    const r = briefing.respostas as Record<string, unknown>;
    contextBlocks.push(
      `## Briefing preenchido pelo cliente\n${JSON.stringify(r, null, 2).slice(0, 1500)}`,
    );
  }

  if (docs && docs.length > 0) {
    contextBlocks.push(
      `## Documentos enviados ao cliente\n${docs.map((d) => `- ${d.titulo} (${d.tipo}) — ${d.aprovacao_meta ? "aprovado" : "aguardando"}`).join("\n")}`,
    );
  }

  const context = contextBlocks.join("\n\n");

  const client = getAnthropic();
  try {
    const response = await client.messages.create({
      model: ANTHROPIC_MODELS.haiku,
      max_tokens: 800,
      system: [
        { type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } },
        { type: "text", text: `CONTEXTO DO PROJETO:\n\n${context}` },
      ],
      messages: [{ role: "user", content: parsed.data.question }],
    });
    const answerBlock = response.content.find((b) => b.type === "text");
    if (!answerBlock || answerBlock.type !== "text") {
      return { ok: false, error: "IA não respondeu." };
    }

    // Audit log: cliente fez pergunta
    await admin.from("audit_log").insert({
      org_id: access.orgId,
      actor_type: "client_portal",
      action: "portal.chat",
      entity_type: "project",
      entity_id: parsed.data.project_id,
      payload: {
        question: parsed.data.question.slice(0, 500),
        cost: summarizeUsage(ANTHROPIC_MODELS.haiku, response.usage).usd_cost,
      },
    });

    return { ok: true, answer: answerBlock.text };
  } catch (err) {
    await captureException(err, {
      tags: { action: "portal.chat" },
      extra: { project_id: parsed.data.project_id },
    });
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Falha ao consultar a IA.",
    };
  }
}
