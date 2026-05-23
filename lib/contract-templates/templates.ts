/**
 * Templates de contrato pré-curados pra escolher como ponto de partida.
 *
 * Cada template define um "addendum" curto que vai anexado ao user message
 * quando geramos contrato via IA. O prompt base continua sendo
 * `lib/ai/prompts/contrato.v1.ts`; o template só direciona ESCOPO, PRAZOS,
 * PAGAMENTO e CLÁUSULAS ESPECÍFICAS pra que o contrato saia adequado ao
 * tipo de obra.
 *
 * Referências CAU/BR (resoluções públicas):
 *   - 51/2013: acompanhamento técnico de obra (RT)
 *   - 67/2013: tabela de honorários e definição de etapas
 *   - 91/2014: contrato escrito obrigatório + escopos típicos
 */

export type ContractTemplateId =
  | "residencial_pf"
  | "residencial_pj_multifamiliar"
  | "comercial"
  | "reforma_retrofit"
  | "projeto_legal"
  | "projeto_completo_rt";

export type ContractTemplate = {
  id: ContractTemplateId;
  nome: string;
  descricaoCurta: string;
  /** Quando faz sentido escolher esse template — usado no card de seleção. */
  ideal: string;
  cauReferencia: string | null;
  /** Diretivas adicionais anexadas ao user message da geração. */
  systemAddition: string;
};

export const CONTRACT_TEMPLATES: ContractTemplate[] = [
  {
    id: "residencial_pf",
    nome: "Residencial unifamiliar (PF)",
    descricaoCurta: "Casa para cliente pessoa física, escopo padrão CAU.",
    ideal:
      "Casa, sobrado, apartamento — cliente PF, escopo típico de projeto + acompanhamento simples.",
    cauReferencia: "Res. CAU/BR 67/2013 + 91/2014",
    systemAddition: `**TIPO DE CONTRATO ESCOLHIDO:** Residencial unifamiliar PF (Pessoa Física).

Diretivas específicas para este template:
- Use o termo "OBRA" ao se referir ao imóvel.
- Na cláusula de Prazos: use prazos típicos de residencial PF — Estudo Preliminar 10d, Anteprojeto 20d, Projeto Legal 15d, Projeto Executivo 30d.
- Na cláusula de Pagamento: parcelamento padrão 20/30/30/20 (Estudo Preliminar / Anteprojeto / Projeto Legal / Executivo).
- Na cláusula de Responsabilidades: explicite que aprovação na prefeitura municipal é responsabilidade do CONTRATANTE — o CONTRATADO entrega projeto legal pronto pra protocolo, mas não responde por taxas, prazo da prefeitura ou exigências adicionais.
- Honorário (a sugerir em observacoes_internas): faixa típica 8-12% sobre custo de obra estimado (CUB local × área).`,
  },
  {
    id: "residencial_pj_multifamiliar",
    nome: "Residencial multifamiliar (PJ)",
    descricaoCurta: "Edifício residencial, contratante PJ (incorporadora).",
    ideal:
      "Prédio, condomínio fechado — contratante é empresa, escopo maior, seguro RC profissional recomendado.",
    cauReferencia: "Res. CAU/BR 67/2013 + 91/2014",
    systemAddition: `**TIPO DE CONTRATO ESCOLHIDO:** Residencial multifamiliar PJ (Pessoa Jurídica — incorporadora/construtora).

Diretivas específicas para este template:
- Use o termo "EMPREENDIMENTO" no lugar de "obra".
- Prazos maiores: Estudo Preliminar 15d, Anteprojeto 30d, Projeto Legal 20d, Projeto Executivo 45d.
- Pagamento por marco de aprovação. Inclua cláusula opcional de bonificação por entrega antecipada (5% sobre o valor da etapa).
- ADICIONE uma cláusula 13 "Garantias e seguros": CONTRATADO mantém seguro de responsabilidade civil profissional com cobertura mínima de R$ 500.000,00 durante a vigência do contrato + 5 anos.
- Honorário (a sugerir em observacoes_internas): faixa típica 4-7% sobre VGV (valor geral de vendas projetado).`,
  },
  {
    id: "comercial",
    nome: "Comercial / Corporativo",
    descricaoCurta: "Loja, escritório, restaurante, clínica.",
    ideal:
      "Espaços comerciais e corporativos com muitas iterações de layout antes de fechar partido.",
    cauReferencia: "Res. CAU/BR 67/2013",
    systemAddition: `**TIPO DE CONTRATO ESCOLHIDO:** Comercial / Corporativo (loja, escritório, restaurante, clínica).

Diretivas específicas para este template:
- Na cláusula de Escopo dos Serviços: inclua explicitamente "projeto de layout funcional" e "estudo de fluxos de pessoas/atendimento" como entregáveis.
- Na cláusula de Alterações de Escopo (CRÍTICA): permita até 3 revisões de layout dentro do prazo original (cliente comercial costuma iterar muito antes de fechar partido). Após o limite, aditivo de 8% do honorário por revisão extra.
- Na cláusula de Responsabilidades: cite NBR específicas conforme tipologia — NBR 9077 (saídas de emergência) sempre que aplicável; RDC ANVISA 50/2002 se clínica/saúde; NBR 9050 (acessibilidade) sempre.
- Honorário: indique em observacoes_internas que pode ser calculado pela tabela mínima CAU (R$/m²) ou negociado por escopo fechado.`,
  },
  {
    id: "reforma_retrofit",
    nome: "Reforma / Retrofit",
    descricaoCurta: "Reforma de imóvel existente, com vícios ocultos previstos em contrato.",
    ideal:
      "Reforma onde imprevistos estruturais são prováveis — cláusula de contingência obrigatória.",
    cauReferencia: "Res. CAU/BR 67/2013",
    systemAddition: `**TIPO DE CONTRATO ESCOLHIDO:** Reforma / Retrofit de imóvel existente.

Diretivas específicas para este template:
- Na cláusula de Objeto: incluir explicitamente "levantamento as-built do imóvel existente" como entrega inicial obrigatória.
- Na cláusula de Prazo: adicione uma "Etapa 0 — Levantamento e Sondagem" (prazo 10 dias úteis) ANTES do Estudo Preliminar.
- Na cláusula de Alterações de Escopo (CRÍTICA — reforce): adicione parágrafo específico: "Descobertas estruturais não-visíveis durante o levantamento inicial (vícios ocultos, instalações fora de norma, problemas estruturais ou patológicos) constatados durante a execução da obra serão objeto de aditivo OBRIGATÓRIO. Estima-se contingência típica de 10-20% sobre o escopo original em obras de reforma."
- Na cláusula de Responsabilidades: deixar claro que o estado estrutural pré-existente é responsabilidade do CONTRATANTE. O CONTRATADO faz vistoria visual mas NÃO avalia patologia estrutural sem laudo específico contratado separadamente.
- Honorário: alertar em observacoes_internas que percentual sobre obra é arriscado em reforma — recomendado usar valor fechado por metro quadrado a reformar.`,
  },
  {
    id: "projeto_legal",
    nome: "Apenas Projeto Legal",
    descricaoCurta: "Escopo limitado: projeto legal + protocolo na prefeitura.",
    ideal:
      "Cliente já tem projeto executivo ou contratará outro profissional — você só faz a aprovação.",
    cauReferencia: "Res. CAU/BR 91/2014",
    systemAddition: `**TIPO DE CONTRATO ESCOLHIDO:** Apenas Projeto Legal (escopo limitado a aprovação na prefeitura).

Diretivas específicas para este template:
- Na cláusula de Objeto: explicite "Elaboração do projeto legal e protocolo na prefeitura municipal. NÃO incluso: projeto executivo, especificações técnicas detalhadas, acompanhamento de obra, projetos complementares (estrutural, elétrico, hidráulico)."
- Na cláusula de Escopo: limitar entregáveis a — plantas baixas, cortes, fachadas, situação, locação, planilha de áreas, memorial descritivo simplificado pra protocolo, ART/RRT de projeto legal. EXCLUIR explicitamente: detalhamento executivo, paginações, especificações de acabamento, projetos complementares.
- Na cláusula de Prazo: prazos compactos — Estudo Preliminar 10d, Projeto Legal 15d, Protocolo + acompanhamento de exigências 30d (sujeito a prazos da prefeitura).
- Na cláusula de Pagamento: pagamento simplificado — 50% na assinatura, 50% no protocolo.
- Na cláusula de Responsabilidades: o CONTRATADO acompanha exigências documentais da prefeitura DURANTE o processo, mas exigências NOVAS fora do escopo original (mudança de zoneamento, exigência de projeto complementar, etc) entram como aditivo.
- Honorário: indicar em observacoes_internas faixa típica de 5-10% do honorário equivalente a um escopo completo.`,
  },
  {
    id: "projeto_completo_rt",
    nome: "Projeto Completo + RT obra",
    descricaoCurta: "Todas as fases + acompanhamento técnico mensal durante obra.",
    ideal: "Cliente quer entrega chave-na-mão — você assina projeto e acompanha execução.",
    cauReferencia: "Res. CAU/BR 51/2013 (acompanhamento) + 91/2014",
    systemAddition: `**TIPO DE CONTRATO ESCOLHIDO:** Projeto Completo + Acompanhamento Técnico de Obra (RT).

Diretivas específicas para este template:
- Na cláusula de Objeto: incluir "elaboração de todas as fases de projeto + acompanhamento técnico mensal da obra com 2 visitas/mês in loco e relatório fotográfico (RDO simplificado)".
- Na cláusula de Escopo: adicionar entregáveis — detalhamento executivo completo, especificações técnicas, planilha orçamentária referencial, relatórios mensais de acompanhamento durante toda a obra.
- Na cláusula de Prazo: incluir nova etapa "Acompanhamento de obra" com duração casada ao prazo de obra estimado (10-18 meses típico) — placeholder "X meses conforme cronograma da obra".
- Na cláusula de Pagamento: dividir em FASE DE PROJETO (60-70% do honorário total, parcelado pelas etapas de projeto) + PARCELAS MENSAIS DURANTE A OBRA (30-40% diluído pelo prazo de execução).
- Na cláusula de Responsabilidades (CRÍTICA — diferencie claramente): explicitar que acompanhamento técnico de PROJETO **não substitui** o responsável técnico de EXECUÇÃO (engenheiro civil / construtora / empreiteiro). O CONTRATADO acompanha conformidade da execução ao projeto, mas NÃO fiscaliza qualidade construtiva nem responde por defeitos de execução.
- Honorário: indicar em observacoes_internas faixa típica de 10-15% sobre o valor de obra estimado.`,
  },
];

export function getContractTemplate(id: ContractTemplateId | string): ContractTemplate | null {
  return CONTRACT_TEMPLATES.find((t) => t.id === id) ?? null;
}
