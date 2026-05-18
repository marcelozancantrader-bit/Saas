-- =============================================
-- Memorial.ai — Sprint 4 (F4): Curated SINAPI seed
-- ~30 composições mais usadas em obras residenciais brasileiras.
-- UF=SP, mês de referência 2026-05-01, com versões desonerada e não-desonerada.
-- Preços em BRL estimados para 2026 (com base em SINAPI 2025 + ajuste inflacionário ~5%).
-- O importer real (Sprint 4.5) substituirá estes dados ao baixar SINAPI oficial mensalmente.
-- =============================================

-- Helper temporário para reduzir duplicação na inserção (desonerada + não-desonerada)
-- Diferença típica desonerado x não-desonerado: ~+3% no não-desonerado.

insert into public.sinapi_compositions (codigo, descricao, unidade, uf, mes_referencia, desonerado, preco)
values
  -- ============= MOVIMENTO DE TERRA / FUNDAÇÃO =============
  ('73964/001', 'Escavação manual em solo de 1ª categoria, profundidade até 1,5m', 'm³', 'SP', '2026-05-01', true, 62.00),
  ('73964/001', 'Escavação manual em solo de 1ª categoria, profundidade até 1,5m', 'm³', 'SP', '2026-05-01', false, 64.00),
  ('74157/004', 'Concreto magro para lastro, fck=15 MPa, traço 1:4,5:4,5', 'm³', 'SP', '2026-05-01', true, 385.00),
  ('74157/004', 'Concreto magro para lastro, fck=15 MPa, traço 1:4,5:4,5', 'm³', 'SP', '2026-05-01', false, 397.00),
  ('92873', 'Concreto fck=25 MPa, traço 1:2,3:2,7, lançado em formas', 'm³', 'SP', '2026-05-01', true, 458.00),
  ('92873', 'Concreto fck=25 MPa, traço 1:2,3:2,7, lançado em formas', 'm³', 'SP', '2026-05-01', false, 472.00),
  ('92775', 'Armadura de aço CA-50, diâmetro 10,0 mm', 'kg', 'SP', '2026-05-01', true, 13.50),
  ('92775', 'Armadura de aço CA-50, diâmetro 10,0 mm', 'kg', 'SP', '2026-05-01', false, 13.90),

  -- ============= ALVENARIA =============
  ('87878', 'Alvenaria de blocos cerâmicos 9x19x19cm, espessura 9cm, com junta vertical e horizontal de 12mm', 'm²', 'SP', '2026-05-01', true, 76.00),
  ('87878', 'Alvenaria de blocos cerâmicos 9x19x19cm, espessura 9cm, com junta vertical e horizontal de 12mm', 'm²', 'SP', '2026-05-01', false, 78.30),
  ('87559', 'Chapisco aplicado em paredes, traço 1:3, espessura 5mm', 'm²', 'SP', '2026-05-01', true, 13.20),
  ('87559', 'Chapisco aplicado em paredes, traço 1:3, espessura 5mm', 'm²', 'SP', '2026-05-01', false, 13.60),
  ('87529', 'Emboço (reboco) interno, espessura 20mm, traço 1:2:8', 'm²', 'SP', '2026-05-01', true, 32.50),
  ('87529', 'Emboço (reboco) interno, espessura 20mm, traço 1:2:8', 'm²', 'SP', '2026-05-01', false, 33.50),
  ('87530', 'Emboço (reboco) externo, espessura 25mm, traço 1:2:8', 'm²', 'SP', '2026-05-01', true, 38.00),
  ('87530', 'Emboço (reboco) externo, espessura 25mm, traço 1:2:8', 'm²', 'SP', '2026-05-01', false, 39.20),

  -- ============= COBERTURA =============
  ('92799', 'Estrutura de madeira para telhado em duas águas, peças roliças, vão até 6m', 'm²', 'SP', '2026-05-01', true, 96.00),
  ('92799', 'Estrutura de madeira para telhado em duas águas, peças roliças, vão até 6m', 'm²', 'SP', '2026-05-01', false, 99.00),
  ('73838/001', 'Telha cerâmica tipo plan, incluindo cumeeira', 'm²', 'SP', '2026-05-01', true, 49.50),
  ('73838/001', 'Telha cerâmica tipo plan, incluindo cumeeira', 'm²', 'SP', '2026-05-01', false, 51.00),
  ('89800', 'Forro de gesso liso, espessura 12mm, fixado em estrutura metálica', 'm²', 'SP', '2026-05-01', true, 66.00),
  ('89800', 'Forro de gesso liso, espessura 12mm, fixado em estrutura metálica', 'm²', 'SP', '2026-05-01', false, 68.00),

  -- ============= ESQUADRIAS =============
  ('90443', 'Porta de madeira interna 80x210cm, com caixilho e ferragens', 'un', 'SP', '2026-05-01', true, 485.00),
  ('90443', 'Porta de madeira interna 80x210cm, com caixilho e ferragens', 'un', 'SP', '2026-05-01', false, 500.00),
  ('90445', 'Porta de entrada de madeira maciça 90x210cm', 'un', 'SP', '2026-05-01', true, 960.00),
  ('90445', 'Porta de entrada de madeira maciça 90x210cm', 'un', 'SP', '2026-05-01', false, 988.00),
  ('91173', 'Janela de alumínio basculante 60x60cm com vidro', 'un', 'SP', '2026-05-01', true, 350.00),
  ('91173', 'Janela de alumínio basculante 60x60cm com vidro', 'un', 'SP', '2026-05-01', false, 360.00),
  ('91174', 'Janela de alumínio de correr 150x120cm, com vidro', 'un', 'SP', '2026-05-01', true, 768.00),
  ('91174', 'Janela de alumínio de correr 150x120cm, com vidro', 'un', 'SP', '2026-05-01', false, 790.00),

  -- ============= PISOS E REVESTIMENTOS =============
  ('87905', 'Contrapiso em argamassa, e=4cm, fck=20 MPa', 'm²', 'SP', '2026-05-01', true, 55.50),
  ('87905', 'Contrapiso em argamassa, e=4cm, fck=20 MPa', 'm²', 'SP', '2026-05-01', false, 57.20),
  ('87265', 'Piso cerâmico esmaltado padrão médio (PEI 4), 45x45cm, assentado', 'm²', 'SP', '2026-05-01', true, 79.00),
  ('87265', 'Piso cerâmico esmaltado padrão médio (PEI 4), 45x45cm, assentado', 'm²', 'SP', '2026-05-01', false, 81.40),
  ('87527', 'Revestimento cerâmico parede (banheiro/cozinha), padrão médio, 25x35cm', 'm²', 'SP', '2026-05-01', true, 88.50),
  ('87527', 'Revestimento cerâmico parede (banheiro/cozinha), padrão médio, 25x35cm', 'm²', 'SP', '2026-05-01', false, 91.10),

  -- ============= PINTURA =============
  ('88488', 'Massa corrida em paredes internas + lixamento', 'm²', 'SP', '2026-05-01', true, 22.50),
  ('88488', 'Massa corrida em paredes internas + lixamento', 'm²', 'SP', '2026-05-01', false, 23.20),
  ('88489', 'Pintura PVA látex em paredes internas, 2 demãos sobre massa', 'm²', 'SP', '2026-05-01', true, 32.00),
  ('88489', 'Pintura PVA látex em paredes internas, 2 demãos sobre massa', 'm²', 'SP', '2026-05-01', false, 33.00),
  ('88500', 'Pintura acrílica em paredes externas, 2 demãos', 'm²', 'SP', '2026-05-01', true, 36.50),
  ('88500', 'Pintura acrílica em paredes externas, 2 demãos', 'm²', 'SP', '2026-05-01', false, 37.60),

  -- ============= INSTALAÇÕES ELÉTRICAS =============
  ('91296', 'Ponto de luz/tomada residencial (eletroduto, caixa, fios, tomada/interruptor)', 'un', 'SP', '2026-05-01', true, 148.00),
  ('91296', 'Ponto de luz/tomada residencial (eletroduto, caixa, fios, tomada/interruptor)', 'un', 'SP', '2026-05-01', false, 152.40),
  ('91295', 'Quadro de distribuição 12 disjuntores, com disjuntor geral', 'un', 'SP', '2026-05-01', true, 385.00),
  ('91295', 'Quadro de distribuição 12 disjuntores, com disjuntor geral', 'un', 'SP', '2026-05-01', false, 396.00),

  -- ============= INSTALAÇÕES HIDRÁULICAS =============
  ('89711', 'Caixa d''água polietileno 1000L com tampa, instalada', 'un', 'SP', '2026-05-01', true, 825.00),
  ('89711', 'Caixa d''água polietileno 1000L com tampa, instalada', 'un', 'SP', '2026-05-01', false, 850.00),
  ('89351', 'Ponto de água fria com tubo PVC 25mm (chuveiro, pia, lavatório)', 'un', 'SP', '2026-05-01', true, 198.00),
  ('89351', 'Ponto de água fria com tubo PVC 25mm (chuveiro, pia, lavatório)', 'un', 'SP', '2026-05-01', false, 204.00),
  ('89352', 'Ponto de esgoto residencial com tubo PVC 50/100mm', 'un', 'SP', '2026-05-01', true, 232.00),
  ('89352', 'Ponto de esgoto residencial com tubo PVC 50/100mm', 'un', 'SP', '2026-05-01', false, 239.00),

  -- ============= LOUÇAS E METAIS =============
  ('86931', 'Vaso sanitário com caixa acoplada + acessórios', 'un', 'SP', '2026-05-01', true, 485.00),
  ('86931', 'Vaso sanitário com caixa acoplada + acessórios', 'un', 'SP', '2026-05-01', false, 500.00),
  ('86877', 'Lavatório de louça branca com coluna + torneira', 'un', 'SP', '2026-05-01', true, 325.00),
  ('86877', 'Lavatório de louça branca com coluna + torneira', 'un', 'SP', '2026-05-01', false, 335.00),
  ('86905', 'Pia de cozinha em aço inox, 1 cuba, com bancada e torneira', 'un', 'SP', '2026-05-01', true, 455.00),
  ('86905', 'Pia de cozinha em aço inox, 1 cuba, com bancada e torneira', 'un', 'SP', '2026-05-01', false, 469.00)
on conflict (codigo, uf, mes_referencia, desonerado) do nothing;
