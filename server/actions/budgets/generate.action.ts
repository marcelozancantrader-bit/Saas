"use server";

import { revalidatePath } from "next/cache";
import Big from "big.js";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import {
  applyRulesV3,
  checkOrcamentoVsCubV3,
  RULES_VERSION_V3,
  type ExtractedPlantaV3,
} from "@/lib/budget/rules/v3";
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
  bdi_pct: z.coerce.number().min(0).max(100).default(28),
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

  // 1. Read project meta + canonical fields — needs confirmed extraction.
  //    Padrão e tipologia vêm das colunas canônicas (única fonte de verdade,
  //    editável via ProjectForm). Demais campos da extração (área, ambientes,
  //    elementos) vêm do meta.extracao_planta (foram inseridos pela IA + confirmados).
  const { data: project, error: projErr } = await supabase
    .from("projects")
    .select("id, meta, tipologia, padrao_construtivo")
    .eq("id", project_id)
    .single();

  if (projErr || !project) {
    return { ok: false, error: "Projeto não encontrado ou sem permissão." };
  }

  const meta = (project.meta ?? {}) as Record<string, unknown>;
  const extracao = meta.extracao_planta as
    | (ExtractedPlantaV3 & {
        confirmed_by_user?: boolean;
        ambientes?: ExtractedPlantaV3["ambientes"];
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

  // 2. Apply rules v2 (cobertura ampliada: estrutura, bancadas, acabamentos lineares,
  //    serviços preliminares, limpeza final, elementos especiais, fator padrão construtivo)
  // Usa colunas canônicas pra padrão/tipologia (fonte única). Se user editou via
  // ProjectForm sem passar pela extração, o valor canônico é a verdade.
  const planta: ExtractedPlantaV3 = {
    area_total_m2: extracao.area_total_m2,
    numero_pavimentos: extracao.numero_pavimentos ?? 1,
    tipologia: (project.tipologia ?? extracao.tipologia) as ExtractedPlantaV3["tipologia"],
    padrao_construtivo:
      (project.padrao_construtivo as ExtractedPlantaV3["padrao_construtivo"]) ??
      extracao.padrao_construtivo ??
      null,
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
  const archItemsRaw = applyRulesV3(planta);
  if (archItemsRaw.length === 0) {
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

  // DEDUP: se uma disciplina foi confirmada com extração própria, descarta os itens
  // estimados do arquitetônico (heurística) pra evitar somar 2x os mesmos pontos.
  // Ex: ruleEletrica do arquitetônico gera ~60 pontos. Se user também confirmou
  // disciplina elétrica com 60 pontos medidos, o orçamento somaria 120 pontos.
  const archItems = archItemsRaw.filter((item) => {
    if (electricalConfirmed && item.rule_id.startsWith("eletrica.")) return false;
    if (hydraulicConfirmed && item.rule_id.startsWith("hidraulica.")) return false;
    if (structuralConfirmed && item.rule_id.startsWith("estrutura.")) return false;
    return true;
  });
  const archDropped = archItemsRaw.length - archItems.length;

  const disciplineItems = [
    ...(electricalConfirmed ? rulesElectricalSinapi(electricalConfirmed) : []),
    ...(hydraulicConfirmed ? rulesHydraulicSinapi(hydraulicConfirmed) : []),
    ...(structuralConfirmed ? rulesStructuralSinapi(structuralConfirmed) : []),
  ];

  // Disciplinas v1 não têm preco_unitario_custom — vão ser inseridas com origem='sinapi'.
  const ruleItems = [
    ...archItems,
    ...disciplineItems.map((d) => ({
      ...d,
      preco_unitario_custom: undefined as Big | undefined,
    })),
  ];

  // 3. Bulk fetch SINAPI prices for the codes we need (skip custom items)
  const sinapiCodes = [
    ...new Set(ruleItems.filter((i) => !i.preco_unitario_custom).map((i) => i.codigo_sinapi)),
  ];
  let priceByCode = new Map<
    string,
    { codigo: string; descricao: string; unidade: string; preco: string }
  >();
  if (sinapiCodes.length > 0) {
    const { data: sinapiRows, error: sinapiErr } = await supabase
      .from("sinapi_compositions")
      .select("codigo, descricao, unidade, preco")
      .in("codigo", sinapiCodes)
      .eq("uf", uf)
      .eq("mes_referencia", mes_referencia)
      .eq("desonerado", desonerado);

    if (sinapiErr) {
      return { ok: false, error: `Falha ao consultar SINAPI: ${sinapiErr.message}` };
    }

    type SinapiRow = { codigo: string; descricao: string; unidade: string; preco: string };
    priceByCode = new Map<string, SinapiRow>(
      (sinapiRows as SinapiRow[] | null)?.map((r) => [r.codigo, r]) ?? [],
    );
  }

  // Faltas no arquitetônico SINAPI (não custom) bloqueiam — sem preço base não tem orçamento.
  const archSinapiCodes = new Set(
    archItems.filter((i) => !i.preco_unitario_custom).map((i) => i.codigo_sinapi),
  );
  const missingArch = [...archSinapiCodes].filter((c) => !priceByCode.has(c));
  if (missingArch.length > 0) {
    return {
      ok: false,
      error: `Códigos SINAPI não encontrados para UF=${uf}, ${mes_referencia}, desonerado=${desonerado}: ${missingArch.join(", ")}. Importe o SINAPI completo ou ajuste os parâmetros.`,
    };
  }
  // Faltas em disciplinas complementares → descarta esses itens e segue.
  const ruleItemsFiltered = ruleItems.filter(
    (i) => i.preco_unitario_custom || priceByCode.has(i.codigo_sinapi),
  );
  const discDropped = ruleItems.length - ruleItemsFiltered.length;

  // 4. Compute next versão
  const { data: existingBudgets } = await supabase
    .from("budgets")
    .select("versao")
    .eq("project_id", project_id)
    .order("versao", { ascending: false })
    .limit(1);
  const nextVersao = ((existingBudgets?.[0]?.versao as number | undefined) ?? 0) + 1;

  // 5. Compute totals — handle SINAPI vs custom origin
  const itemsForInsert = ruleItemsFiltered.map((item, idx) => {
    let precoUnitario: Big;
    let unidade: string;
    let origem: "sinapi" | "custom";

    if (item.preco_unitario_custom) {
      precoUnitario = item.preco_unitario_custom;
      unidade = item.unidade;
      origem = "custom";
    } else {
      const sinapi = priceByCode.get(item.codigo_sinapi)!;
      precoUnitario = new Big(sinapi.preco);
      unidade = sinapi.unidade;
      // Aplica multiplicador de preço pra refletir padrão construtivo
      // (porcelanato vs cerâmico, esquadrias premium, etc) preservando o código SINAPI.
      const mult = (item as { multiplicador_preco?: number }).multiplicador_preco;
      if (mult !== undefined && mult !== 1) {
        precoUnitario = precoUnitario.times(mult);
      }
      origem = "sinapi";
    }
    return {
      ordem: idx + 1,
      composicao_codigo: item.codigo_sinapi,
      descricao: item.descricao_local,
      unidade,
      quantidade: item.quantidade.round(4, Big.roundHalfUp).toFixed(4),
      preco_unitario: precoUnitario.round(4, Big.roundHalfUp).toFixed(4),
      total_calc: item.quantidade.times(precoUnitario),
      origem,
      disciplina: item.disciplina ?? "architectural",
    };
  });
  const totalBruto = sumMoney(itemsForInsert.map((i) => i.total_calc));
  const totalComBdi = applyBdi(totalBruto, bdi_pct);

  // 5b. Sanity check vs CUB — warn no observações se fora da faixa esperada.
  //     CUB é base de custo (sem BDI), então comparamos com total bruto.
  const cubCheck = checkOrcamentoVsCubV3(
    Number(totalBruto.toString()),
    extracao.area_total_m2 ?? 0,
    extracao.padrao_construtivo ?? null,
  );

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
        `Gerado automaticamente (rules ${RULES_VERSION_V3}+${DISCIPLINE_RULES_VERSION}).`,
        electricalConfirmed
          ? "Inclui itens elétricos da disciplina (planta arquitetônica não estimou)."
          : null,
        hydraulicConfirmed ? "Inclui itens hidráulicos da disciplina." : null,
        structuralConfirmed ? "Inclui itens estruturais da disciplina." : null,
        archDropped > 0
          ? `${archDropped} item(ns) heurísticos do arquitetônico descartados pra evitar duplicação com disciplina confirmada.`
          : null,
        discDropped > 0
          ? `${discDropped} item(ns) de disciplinas complementares descartados por falta de preço SINAPI.`
          : null,
        // Warning: extração com confiança baixa da IA
        (extracao as { confianca?: string }).confianca === "baixa"
          ? "⚠ Extração da planta marcada pela IA com CONFIANÇA BAIXA — revise os valores antes de usar este orçamento."
          : null,
        // Warning: ambientes vazios → itens dependentes (pontos elétricos, louças) zerados
        (extracao.ambientes?.length ?? 0) === 0
          ? "⚠ Nenhum ambiente detectado na planta — pontos elétricos/hidráulicos, louças, bancadas e revestimento de parede ficaram zerados. Re-suba a planta arquitetônica."
          : null,
        cubCheck.msg ? `⚠ ${cubCheck.msg}` : null,
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
