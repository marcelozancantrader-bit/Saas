/**
 * Dados de demonstração — projeto "Casa Exemplo 120m²".
 *
 * Hand-curated em vez de gerado por IA: o usuário novo recebe um projeto
 * pré-populado para explorar todas as features sem precisar subir planta,
 * confirmar extração, gerar docs (que custaria $0.50 + 9min de espera).
 *
 * Realismo: dados típicos de um sobrado padrão médio em Curitiba — número
 * de ambientes coerentes com 120m², materiais e cláusulas alinhados com
 * NBRs citadas nos memoriais.
 */

export const DEMO_CLIENT = {
  nome: "Cliente Demonstração — João da Silva",
  cpf_cnpj: "123.456.789-00",
  email: "joao.silva.demo@example.com",
  telefone: "(41) 99999-9999",
  endereco_cep: "80010-000",
  endereco_logradouro: "Rua das Acácias",
  endereco_numero: "123",
  endereco_complemento: "Casa",
  endereco_bairro: "Centro",
  endereco_cidade: "Curitiba",
  endereco_uf: "PR",
};

export const DEMO_PROJECT = {
  nome: "Casa Exemplo 120m² — Demo",
  tipologia: "residencial" as const,
  area_prevista_m2: 120,
  padrao_construtivo: "medio" as const,
  endereco_cep: "80010-000",
  endereco_completo: "Rua das Flores, 456 — Bairro Bigorrilho, Curitiba/PR",
  status: "em_andamento" as const,
  cidade_codigo: "curitiba",
  zoneamento: "zr-2",
  area_terreno_m2: 360,
  valor_contrato: 28000,
};

export const DEMO_EXTRACAO_PLANTA = {
  area_total_m2: 120,
  area_terreno_m2: 360,
  numero_pavimentos: 1,
  tipologia: "residencial",
  padrao_construtivo: "medio",
  ambientes: [
    { nome: "Sala estar/jantar integrada", area_m2: 28, tipo: "sala" },
    { nome: "Cozinha", area_m2: 12, tipo: "cozinha" },
    { nome: "Lavabo", area_m2: 2.5, tipo: "lavabo" },
    { nome: "Quarto 1", area_m2: 12, tipo: "quarto" },
    { nome: "Quarto 2", area_m2: 11, tipo: "quarto" },
    { nome: "Suíte master", area_m2: 16, tipo: "suite" },
    { nome: "Banheiro social", area_m2: 4.5, tipo: "banheiro" },
    { nome: "Banheiro suíte", area_m2: 5, tipo: "suite_banheiro" },
    { nome: "Área de serviço", area_m2: 5, tipo: "area_servico" },
    { nome: "Garagem coberta (2 vagas)", area_m2: 24, tipo: "garagem" },
  ],
  elementos_especiais: {
    piscina: false,
    churrasqueira: true,
    sacada: false,
    garagem: true,
    jardim: true,
    area_servico_externa: false,
  },
  observacoes:
    "Demonstração — dados hipotéticos pra você explorar o produto sem precisar subir PDF.",
  confianca: "alta",
  confirmed_by_user: true,
  confirmed_at: new Date().toISOString(),
  _meta: {
    prompt_version: "demo.v1",
    usage: { usd_cost: 0 },
  },
};

type TiptapNode = {
  type: string;
  attrs?: Record<string, unknown>;
  content?: TiptapNode[];
  text?: string;
};

function h2(text: string): TiptapNode {
  return { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text }] };
}

function p(text: string): TiptapNode {
  return { type: "paragraph", content: [{ type: "text", text }] };
}

function ul(items: string[]): TiptapNode {
  return {
    type: "bulletList",
    content: items.map((i) => ({
      type: "listItem",
      content: [{ type: "paragraph", content: [{ type: "text", text: i }] }],
    })),
  };
}

function doc(content: TiptapNode[]): TiptapNode {
  return { type: "doc", content };
}

// --- 1. Memorial descritivo geral ---
export const DEMO_DOC_MEMORIAL = {
  titulo: "Memorial Descritivo — Casa Exemplo 120m²",
  conteudo_tiptap: doc([
    h2("1. Considerações iniciais"),
    p(
      "O presente Memorial Descritivo refere-se à construção de residência unifamiliar de padrão médio para o cliente João da Silva, localizada à Rua das Flores, 456, bairro Bigorrilho, Curitiba/PR, em terreno de 360m². A edificação possui área total construída de 120,00 m² em pavimento único.",
    ),
    p(
      "Este documento foi elaborado com base na NBR 12.722 (Discriminação Orçamentária para Construção de Edifícios), seguindo a estrutura nela preconizada. Cita NBR 15.575 (Desempenho de Edificações) nos itens cabíveis.",
    ),
    h2("2. Características da edificação"),
    p(
      "Pavimento único contendo: sala estar/jantar integrada (28m²), cozinha (12m²), lavabo (2,5m²), 2 quartos (12 e 11m²), suíte master com banheiro (21m²), banheiro social (4,5m²), área de serviço (5m²) e garagem coberta para 2 vagas (24m²). Há churrasqueira na área externa e jardim.",
    ),
    h2("3. Serviços preliminares"),
    p(
      "Limpeza e nivelamento do terreno, locação da obra com gabarito, instalação do canteiro com barracão de 12m², ligações provisórias de água e energia junto à SANEPAR e COPEL respectivamente, tapume frontal de chapa metálica galvanizada.",
    ),
    h2("4. Fundações"),
    p(
      "Sapata corrida em concreto armado fck=25MPa, armadura CA-50 com bitolas conforme cálculo estrutural, recobrimento mínimo 5cm em contato com solo, profundidade mínima 80cm abaixo do nível natural. Impermeabilização com argamassa polimérica sob a primeira fiada.",
    ),
    h2("5. Estrutura"),
    p(
      "Pilaretes de concreto armado fck=25MPa nas extremidades e a cada 4m. Cinta de amarração superior em todo perímetro. Vigas chatas embutidas em alvenaria para vãos até 4m, vigas invertidas em platibanda.",
    ),
    h2("6. Vedação e revestimentos"),
    p(
      "Alvenaria em blocos cerâmicos 9x19x19 (paredes internas) e 14x19x29 (paredes externas), assentados com argamassa traço 1:2:8 (cimento:cal:areia média). Chapisco 1:3 cimento:areia, emboço interno 20mm e externo 25mm.",
    ),
    h2("7. Cobertura"),
    p(
      "Estrutura em madeira de eucalipto tratado seção 6x12cm, telhamento em cerâmica tipo plan, cumeeira ventilada, calhas e rufos em chapa galvanizada, forro em laje pré-moldada com gesso liso aplicado por baixo.",
    ),
    h2("8. Esquadrias"),
    p(
      "Portas internas em madeira de pinus pintada com 60-80cm de vão livre conforme ambiente (banheiro 80cm pra acessibilidade NBR 9050). Porta de entrada em madeira maciça 90cm. Janelas de alumínio anodizado branco com vidro temperado 4mm.",
    ),
    h2("9. Instalações elétricas"),
    p(
      "Padrão de entrada COPEL bifásico 50A. Quadro de distribuição com 10 circuitos, disjuntores DR 30mA em áreas molhadas, DPS classe II. Tomadas e iluminação dimensionadas conforme NBR 5410. Fios cobre antichama 1,5mm² (iluminação), 2,5mm² (TUGs), 4mm² (chuveiro).",
    ),
    h2("10. Instalações hidráulicas"),
    p(
      "Água fria em PVC marrom soldável Ø25mm (alimentação) e Ø20mm (ramais), reservatório elevado 1.000L em polietileno alimentar. Aquecimento solar com boiler 200L + apoio elétrico. Esgoto sanitário em PVC série esgoto Ø50/Ø75/Ø100mm conforme NBR 8160, com fossa séptica + filtro anaeróbio (terreno sem rede pública).",
    ),
    h2("11. Acabamentos"),
    p(
      "Piso porcelanato técnico retificado 60x60cm (áreas secas), porcelanato esmaltado antiderrapante 45x45cm (áreas molhadas). Pintura interna PVA látex 2 demãos, externa acrílica 2 demãos. Louças e metais Deca linha standard ou equivalente.",
    ),
    h2("12. Limpeza e entrega"),
    p(
      "Limpeza grossa (retirada de entulho e sobras), limpeza fina (vidros, pisos, metais), retirada do canteiro de obra, vistoria com checklist em conjunto com o proprietário, entrega das chaves mediante termo de recebimento assinado.",
    ),
  ]),
};

// --- 2. Caderno de especificações (resumido) ---
export const DEMO_DOC_CADERNO = {
  titulo: "Caderno de Especificações Técnicas — Casa Exemplo 120m²",
  conteudo_tiptap: doc([
    h2("Movimento de terra e fundações"),
    ul([
      "Escavação manual nas faixas das sapatas corridas, profundidade mínima 80cm.",
      "Sapata corrida 30x40cm em concreto armado fck=25 MPa, armadura CA-50 4Ø10mm + estribos Ø6mm a cada 20cm.",
      "Recobrimento mínimo 5cm em contato com solo.",
      "Aterro interno compactado em camadas de 20cm com placa vibratória.",
    ]),
    h2("Estrutura"),
    ul([
      "Pilaretes 14x19cm em concreto armado fck=25 MPa, armadura CA-50 4Ø8mm + estribos Ø5mm a cada 15cm.",
      "Vergas e contravergas 14cm de altura, transpasse 30cm em cada lado das aberturas.",
      "Cinta de amarração no respaldo 14cm de altura em todo perímetro.",
    ]),
    h2("Vedação"),
    ul([
      "Blocos cerâmicos 9x19x19 vedação interna; 14x19x29 vedação externa.",
      "Argamassa de assentamento traço 1:2:8 (cimento:cal:areia média), juntas 12mm.",
      "Cinta de amarração na base e no respaldo, vergas e contravergas em aberturas.",
    ]),
    h2("Revestimentos de parede"),
    ul([
      "Chapisco traço 1:3 cimento:areia, espessura 5mm.",
      "Emboço interno 20mm, externo 25mm, traço 1:2:8.",
      "Reboco fino em áreas internas pra pintura.",
    ]),
    h2("Pisos e revestimentos"),
    ul([
      "Contrapiso de regularização espessura 4cm, traço 1:4, com caimento 0,5% pra ralos.",
      "Porcelanato técnico retificado 60x60cm PEI 4 nas áreas secas.",
      "Porcelanato esmaltado 45x45cm antiderrapante (R10) nas áreas molhadas.",
      "Rejunte epóxi nas áreas molhadas, rejunte cimentício nas demais.",
    ]),
    h2("Cobertura"),
    ul([
      "Estrutura de madeira de eucalipto tratado (CCA), trama 6x12cm.",
      "Telha cerâmica tipo plan, inclinação 30%.",
      "Cumeeira ventilada, calhas chapa galvanizada nº 24, rufos lateral e frontal.",
      "Forro de gesso liso 12mm sobre laje pré-moldada.",
    ]),
    h2("Esquadrias"),
    ul([
      "Portas internas pinus pintada 0,80x2,10m (banheiros, lavabo, áreas de serviço).",
      "Portas internas 0,70x2,10m (quartos).",
      "Porta de entrada madeira maciça 0,90x2,10m com fechadura tetra-chave.",
      "Janelas alumínio anodizado branco com vidro temperado 4mm.",
    ]),
    h2("Instalações elétricas (NBR 5410)"),
    ul([
      "Padrão de entrada COPEL bifásico 50A, ramal subterrâneo.",
      "Quadro de distribuição com 10 circuitos: 4 iluminação, 4 TUGs, 2 TUEs (chuveiro suíte + chuveiro social).",
      "Disjuntor DR 30mA em todos os circuitos com tomadas.",
      "DPS classe II monofásico em todas as fases.",
    ]),
    h2("Instalações hidráulicas (NBR 5626, 8160)"),
    ul([
      "Reservatório elevado polietileno alimentar 1.000L com tampa hermética.",
      "Tubulação PVC marrom soldável Ø25mm alimentação, Ø20mm ramais.",
      "Aquecedor solar 200L com apoio elétrico 1.500W.",
      "Esgoto PVC série esgoto Ø50/75/100mm, caixa de inspeção 60x60cm a cada 25m.",
      "Fossa séptica + filtro anaeróbio dimensionados pra 5 pessoas (NBR 7229).",
    ]),
    h2("Pintura"),
    ul([
      "Preparo: massa corrida 2 demãos + lixamento + selador acrílico.",
      "Interna: PVA látex acetinado 2 demãos cor a definir com cliente.",
      "Externa: acrílica fosca 2 demãos sobre selador.",
      "Esquadrias: esmalte sintético acetinado 2 demãos.",
    ]),
    h2("Louças, metais e acessórios"),
    ul([
      "Bacia sanitária com caixa acoplada dual flush (3/6L) — Deca standard.",
      "Lavatório com coluna ou bancada em granito.",
      "Torneiras monocomando ou pressmatic na cozinha.",
      "Ducha higiênica em todos os banheiros.",
      "Chuveiro com registro termoestático (NBR 14534).",
    ]),
    h2("Limpeza e entrega"),
    ul([
      "Limpeza grossa: retirada de entulho, sobras de obra e desmontagem do canteiro.",
      "Limpeza fina: vidros, pisos, metais, esquadrias, bancadas.",
      "Vistoria final com checklist em conjunto com o cliente.",
      "Termo de entrega com fotos e relatório de garantias.",
    ]),
  ]),
};

// --- 3. Proposta comercial ---
export const DEMO_DOC_PROPOSTA = {
  titulo: "Proposta Comercial — Casa Exemplo 120m²",
  conteudo_tiptap: doc([
    h2("Apresentação"),
    p(
      "É com satisfação que apresentamos a proposta de prestação de serviços de projeto e acompanhamento técnico para a construção da sua residência de 120m² em padrão médio, localizada em Curitiba/PR.",
    ),
    h2("Escopo"),
    ul([
      "Projeto arquitetônico completo (planta baixa, cortes, fachadas, planta de cobertura)",
      "Projeto estrutural (fundação, supraestrutura)",
      "Projeto hidrossanitário (água fria, esgoto, pluviais)",
      "Projeto elétrico (NBR 5410)",
      "Memorial descritivo e caderno de especificações",
      "Acompanhamento técnico durante a obra (3 visitas mensais)",
      "ART/RRT no CAU/CREA",
    ]),
    h2("Prazos"),
    p(
      "Projeto executivo completo: 45 dias corridos a partir da assinatura do contrato e pagamento do sinal. Acompanhamento de obra: durante toda a execução da obra (estimado em 6 meses).",
    ),
    h2("Investimento"),
    p("Investimento total: R$ 28.000,00 (vinte e oito mil reais), pagos da seguinte forma:"),
    ul([
      "30% no ato da assinatura (R$ 8.400,00) — sinal de honorários",
      "30% na entrega do anteprojeto aprovado (R$ 8.400,00)",
      "20% na entrega do projeto executivo completo (R$ 5.600,00)",
      "20% ao longo do acompanhamento da obra (R$ 5.600,00 em 6 parcelas de R$ 933,33)",
    ]),
    p(
      "Pagamentos via PIX, boleto ou transferência. Aceitamos cartão de crédito em até 6x sem juros pelo PicPay/Mercado Pago.",
    ),
    h2("O que está incluso"),
    ul([
      "Atendimento personalizado e ilimitado durante o desenvolvimento do projeto",
      "Reuniões presenciais ou online (à sua escolha)",
      "Renderizações 3D do anteprojeto",
      "Compatibilização entre projetos arquitetônico, estrutural, hidráulico e elétrico",
      "Memorial descritivo completo conforme NBR 12.722",
      "Especificação de materiais e acabamentos",
    ]),
    h2("O que NÃO está incluso"),
    ul([
      "Levantamento topográfico (orientamos contratar profissional habilitado)",
      "Sondagem do solo (necessária pra projeto estrutural)",
      "Taxa de aprovação na prefeitura e taxa de habite-se",
      "Projetos especiais (paisagismo, automação, energia solar) — pode ser contratado à parte",
      "Execução da obra (somos projeto + acompanhamento, não construímos)",
    ]),
    h2("Validade"),
    p(
      "Esta proposta tem validade de 30 dias a partir da data de emissão. Após esse prazo, valores e prazos podem ser revisados.",
    ),
    h2("Próximos passos"),
    p(
      "Em caso de aceite, formalizamos com contrato de prestação de serviços. Aguardamos seu retorno!",
    ),
  ]),
};

// --- 4. Contrato (resumido) ---
export const DEMO_DOC_CONTRATO = {
  titulo: "Contrato de Prestação de Serviços — Casa Exemplo 120m²",
  conteudo_tiptap: doc([
    h2("Cláusula 1 — Das partes"),
    p(
      "CONTRATANTE: João da Silva, CPF 123.456.789-00, residente à Rua das Acácias, 123, Curitiba/PR. CONTRATADA: [Nome do Escritório], pessoa jurídica inscrita no CNPJ [...], com registro no CAU/CREA [...].",
    ),
    h2("Cláusula 2 — Objeto"),
    p(
      "O objeto do presente contrato é a prestação de serviços técnicos de projeto e acompanhamento da construção de residência unifamiliar com área de 120m² localizada à Rua das Flores, 456, Curitiba/PR.",
    ),
    h2("Cláusula 3 — Escopo dos serviços"),
    p(
      "Inclui: projeto arquitetônico, estrutural, hidrossanitário, elétrico; memorial descritivo e caderno de especificações conforme NBR 12.722; acompanhamento técnico durante a obra; emissão de ART/RRT.",
    ),
    h2("Cláusula 4 — Valor e forma de pagamento"),
    p(
      "Valor total: R$ 28.000,00. Pagamentos conforme cronograma anexo (30% sinal, 30% anteprojeto, 20% executivo, 20% ao longo do acompanhamento).",
    ),
    h2("Cláusula 5 — Prazos"),
    p(
      "Anteprojeto: 20 dias. Projeto executivo completo: 45 dias após assinatura. Acompanhamento: durante toda a execução da obra. Atrasos por solicitações do CONTRATANTE não computam no prazo.",
    ),
    h2("Cláusula 6 — Alterações de escopo"),
    p(
      "Quaisquer alterações solicitadas pelo CONTRATANTE após o aceite do anteprojeto serão formalizadas por aditivo contratual, com cálculo de impacto em valor e prazo. Alterações realizadas verbalmente sem aditivo não geram obrigação à CONTRATADA.",
    ),
    h2("Cláusula 7 — Responsabilidades"),
    ul([
      "CONTRATADA: realizar os serviços com diligência, emitir ART/RRT, manter o CONTRATANTE informado.",
      "CONTRATANTE: pagar nos prazos, fornecer informações solicitadas (topografia, sondagem), aprovar fases do projeto.",
    ]),
    h2("Cláusula 8 — Rescisão"),
    p(
      "O contrato pode ser rescindido por qualquer parte com aviso prévio de 30 dias. Em caso de rescisão antecipada, o CONTRATANTE pagará proporcionalmente ao serviço entregue, acrescido de 20% como multa.",
    ),
    h2("Cláusula 9 — Propriedade intelectual"),
    p(
      "Os projetos pertencem à CONTRATADA até o pagamento integral. Após quitação, o CONTRATANTE recebe licença de uso para a obra específica deste contrato.",
    ),
    h2("Cláusula 10 — Foro"),
    p(
      "Fica eleito o foro da comarca de Curitiba/PR para dirimir quaisquer questões oriundas do presente contrato, com renúncia a qualquer outro.",
    ),
    h2("Cláusula 11 — Disposições finais"),
    p(
      "O presente contrato obriga as partes e seus sucessores. Modificações apenas por aditivo escrito e assinado por ambas as partes.",
    ),
  ]),
};

export const DEMO_DOCS = [
  { tipo: "memorial" as const, ...DEMO_DOC_MEMORIAL, prompt_versao: "demo.v1" },
  { tipo: "caderno" as const, ...DEMO_DOC_CADERNO, prompt_versao: "demo.v1" },
  { tipo: "proposta" as const, ...DEMO_DOC_PROPOSTA, prompt_versao: "demo.v1" },
  { tipo: "contrato" as const, ...DEMO_DOC_CONTRATO, prompt_versao: "demo.v1" },
];
