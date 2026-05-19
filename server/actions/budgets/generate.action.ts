"use server";

import { revalidatePath } from "next/cache";
import Big from "big.js";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { applyRulesV1, RULES_VERSION, type ExtractedPlanta } from "@/lib/budget/rules/v1";
import {
  DISCIPLINE_RULES_VERSION,
  rulesElectricalSinapi,
  rulesHydraulicSinapi,
  rulesStructuralSinapi,
  type ElectricalData,
  type HydraulicData,
  type StructuralData,
} from "@/lib/budget/rules/disciplines.v1";
import { applyBdi, sumMoney, toDbNumeric } from "@/lib/utils/money";

const generateSchema = z.object({
  project_id: z.string().uuid(),
  uf: z.string().length(2).default("SP"),
  mes_referencia: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .default("2026-05-01"),
  desonerado: z.boolean().default(true),
  bdi_pct: z.coerce.number().min(0).max(100).default(25),
});

export type GenerateBudgetInput = z.infer<typeof generateSchema>;

export type GenerateBudgetResult =
  | { ok: true; budget_id: string; items_count: number; total_com_bdi: string }
  | { ok: false; error: string };

export async function generateBudgetAction(
  raw: GenerateBudgetInput,
): Promise<GenerateBudgetResult> {
  const parsed = generateSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: "Parâmetros inválidos." };
  }
  const { project_id, uf, mes_referencia, desonerado, bdi_pct } = parsed.data;

  const supabase = await createClient();

  // 1. Read project meta — needs confirmed extraction
  const { data: project, error: projErr } = await supabase
    .from("projects")
    .select("id, meta")
    .eq("id", project_id)
    .single();

  if (projErr || !project) {
    return { ok: false, error: "Projeto não encontrado ou sem permissão." };
  }

  const meta = (project.meta ?? {}) as Record<string, unknown>;
  const extracao = meta.extracao_planta as
    | (ExtractedPlanta & {
        confirmed_by_user?: boolean;
        ambientes?: ExtractedPlanta["ambientes"];
      })
    | undefined;

  if (!extracao) {
    return {
      ok: false,
      error:
        "Suba a planta arquitetônica em PDF na aba 'Planta & IA' do projeto. A IA leva ~1 minuto para extrair os dados.",
    };
  }

  if (!extracao.confirmed_by_user) {
    return {
      ok: false,
      error:
        "A extração já foi feita — falta confirmar. Volte ao projeto, aba 'Planta & IA', e clique em 'Confirmar e atualizar projeto' no card 'Extração da planta (IA)'.",
    };
  }

  if (!extracao.area_total_m2 || extracao.area_total_m2 <= 0) {
    return {
      ok: false,
      error:
        "A extração não tem área total. Edite o valor no card 'Extração da planta (IA)' e re-confirme antes de gerar o orçamento.",
    };
  }

  // 2. Apply rules v1
  const planta: ExtractedPlanta = {
    area_total_m2: extracao.area_total_m2,
    numero_pavimentos: extracao.numero_pavimentos ?? 1,
    tipologia: extracao.tipologia,
    padrao_construtivo: extracao.padrao_construtivo ?? null,
    ambientes: extracao.ambientes ?? [],
    elementos_especiais: extracao.elementos_especiais ?? {
      piscina: false,
      churrasqueira: false,
      sacada: false,
      garagem: false,
      jardim: false,
      area_servico_externa: false,
    },
  };
  const archItems = applyRulesV1(planta);
  if (archItems.length === 0) {
    return { ok: false, error: "Nenhuma regra retornou itens — verifique os dados da planta." };
  }

  // 2b. Disciplinas complementares confirmadas — somam itens SINAPI ao mesmo orçamento.
  const extracoesDisc =
    (meta.extracoes_disciplinas as
      | Record<string, { data?: unknown; confirmed_by_user?: boolean } | undefined>
      | undefined) ?? {};

  const electricalConfirmed = extracoesDisc.electrical?.confirmed_by_user
    ? (extracoesDisc.electrical.data as ElectricalData)
    : null;
  const hydraulicConfirmed = extracoesDisc.hydraulic?.confirmed_by_user
    ? (extracoesDisc.hydraulic.data as HydraulicData)
    : null;
  const structuralConfirmed = extracoesDisc.structural?.confirmed_by_user
    ? (extracoesDisc.structural.data as StructuralData)
    : null;

  const disciplineItems = [
    ...(electricalConfirmed ? rulesElectricalSinapi(electricalConfirmed) : []),
    ...(hydraulicConfirmed ? rulesHydraulicSinapi(hydraulicConfirmed) : []),
    ...(structuralConfirmed ? rulesStructuralSinapi(structuralConfirmed) : []),
  ];

  const ruleItems = [...archItems, ...disciplineItems];

  // 3. Bulk fetch SINAPI prices for the codes we need
  const uniqueCodes = [...new Set(ruleItems.map((i) => i.codigo_sinapi))];
  const { data: sinapiRows, error: sinapiErr } = await supabase
    .from("sinapi_compositions")
    .select("codigo, descricao, unidade, preco")
    .in("codigo", uniqueCodes)
    .eq("uf", uf)
    .eq("mes_referencia", mes_referencia)
    .eq("desonerado", desonerado);

  if (sinapiErr) {
    return { ok: false, error: `Falha ao consultar SINAPI: ${sinapiErr.message}` };
  }

  type SinapiRow = { codigo: string; descricao: string; unidade: string; preco: string };
  const priceByCode = new Map<string, SinapiRow>(
    (sinapiRows as SinapiRow[] | null)?.map((r) => [r.codigo, r]) ?? [],
  );

  const missing = uniqueCodes.filter((c) => !priceByCode.has(c));
  const archCodes = new Set(archItems.map((i) => i.codigo_sinapi));
  const missingArch = missing.filter((c) => archCodes.has(c));
  // Faltas no arquitetônico bloqueiam — sem preço base não tem orçamento.
  if (missingArch.length > 0) {
    return {
      ok: false,
      error: `Códigos SINAPI não encontrados para UF=${uf}, ${mes_referencia}, desonerado=${desonerado}: ${missingArch.join(", ")}. Importe o SINAPI completo ou ajuste os parâmetros.`,
    };
  }
  // Faltas em disciplinas complementares → descarta esses itens e segue.
  const ruleItemsFiltered = ruleItems.filter((i) => priceByCode.has(i.codigo_sinapi));
  const discDropped = ruleItems.length - ruleItemsFiltered.length;

  // 4. Compute next versão
  const { data: existingBudgets } = await supabase
    .from("budgets")
    .select("versao")
    .eq("project_id", project_id)
    .order("versao", { ascending: false })
    .limit(1);
  const nextVersao = ((existingBudgets?.[0]?.versao as number | undefined) ?? 0) + 1;

  // 5. Compute totals
  const itemsForInsert = ruleItemsFiltered.map((item, idx) => {
    const sinapi = priceByCode.get(item.codigo_sinapi)!;
    const precoUnitario = new Big(sinapi.preco);
    return {
      ordem: idx + 1,
      composicao_codigo: item.codigo_sinapi,
      descricao: item.descricao_local,
      unidade: sinapi.unidade,
      quantidade: item.quantidade.round(4, Big.roundHalfUp).toFixed(4),
      preco_unitario: precoUnitario.round(4, Big.roundHalfUp).toFixed(4),
      total_calc: item.quantidade.times(precoUnitario), // só pra somar — o banco gera o stored
      origem: "sinapi" as const,
      disciplina: item.disciplina ?? "architectural",
    };
  });
  const totalBruto = sumMoney(itemsForInsert.map((i) => i.total_calc));
  const totalComBdi = applyBdi(totalBruto, bdi_pct);

  // 6. Insert budget
  const { data: budget, error: budgetErr } = await supabase
    .from("budgets")
    .insert({
      project_id,
      versao: nextVersao,
      uf,
      mes_referencia,
      desonerado,
      bdi_pct,
      total_bruto: toDbNumeric(totalBruto),
      total_com_bdi: toDbNumeric(totalComBdi),
      observacoes: [
        `Gerado automaticamente (rules ${RULES_VERSION}+${DISCIPLINE_RULES_VERSION}).`,
        electricalConfirmed ? "Inclui itens elétricos." : null,
        hydraulicConfirmed ? "Inclui itens hidráulicos." : null,
        structuralConfirmed ? "Inclui itens estruturais." : null,
        discDropped > 0
          ? `${discDropped} item(ns) de disciplinas complementares descartados por falta de preço SINAPI.`
          : null,
      ]
        .filter(Boolean)
        .join(" "),
      status: "rascunho",
    })
    .select("id")
    .single();

  if (budgetErr || !budget) {
    return { ok: false, error: `Falha ao criar orçamento: ${budgetErr?.message}` };
  }

  // 7. Insert items (skip the in-memory total_calc — the DB has a generated column for total)
  const { error: itemsErr } = await supabase.from("budget_items").insert(
    itemsForInsert.map((item, idx) => ({
      budget_id: budget.id,
      ordem: idx + 1,
      composicao_codigo: item.composicao_codigo,
      descricao: item.descricao,
      unidade: item.unidade,
      quantidade: item.quantidade,
      preco_unitario: item.preco_unitario,
      origem: item.origem,
      disciplina: item.disciplina,
    })),
  );

  if (itemsErr) {
    // Try to cleanup the budget row
    await supabase.from("budgets").delete().eq("id", budget.id);
    return { ok: false, error: `Falha ao inserir itens: ${itemsErr.message}` };
  }

  revalidatePath(`/projetos/${project_id}`);
  revalidatePath(`/projetos/${project_id}/orcamento`);

  return {
    ok: true,
    budget_id: budget.id,
    items_count: itemsForInsert.length,
    total_com_bdi: toDbNumeric(totalComBdi),
  };
}
