-- =============================================
-- Memorial.ai — Reseed v3: códigos SINAPI corretos com descrições oficiais
--
-- A v2 (migration 20260720000001) usou códigos cuja descrição oficial SINAPI
-- não bate com o que o orçamento mostrava. Exemplos: 89800 era tubo PVC esgoto
-- mas eu chamava de "forro gesso"; 91173/91174 eram fixação de tubos PVC mas
-- eu chamava de "janelas"; 87878 era chapisco mas eu chamava de "alvenaria".
--
-- Esta migration:
--   1. Apaga os preços antigos (UF=SP, mes=2026-05-01) — todos os códigos
--      errados ficam órfãos e param de ser referenciados pelas regras v3.
--   2. Insere os preços novos com códigos modernos confirmados (SINAPI AF 2023-2025).
--
-- Orçamentos antigos NÃO são afetados — budget_items grava snapshot completo
-- (composicao_codigo, descricao, preco_unitario) no momento da geração.
-- =============================================

-- 1. Limpa preços antigos para UF=SP, 2026-05-01 (ambos regimes)
delete from public.sinapi_compositions
  where uf = 'SP' and mes_referencia = '2026-05-01';

-- 2. Insere preços com códigos modernos (SINAPI Q1/2026 estimado SP)
insert into public.sinapi_compositions (codigo, descricao, unidade, uf, mes_referencia, desonerado, preco)
values
  -- ============= MOVIMENTO DE TERRA / FUNDAÇÃO =============
  ('96523', 'Escavação manual para bloco de coroamento ou sapata', 'm³', 'SP', '2026-05-01', true, 135.00),
  ('96523', 'Escavação manual para bloco de coroamento ou sapata', 'm³', 'SP', '2026-05-01', false, 139.10),

  ('96619', 'Lastro de concreto magro fck=15 MPa, aplicado em blocos/sapatas, espessura 5cm', 'm²', 'SP', '2026-05-01', true, 48.00),
  ('96619', 'Lastro de concreto magro fck=15 MPa, aplicado em blocos/sapatas, espessura 5cm', 'm²', 'SP', '2026-05-01', false, 49.45),

  ('94965', 'Concreto fck=25 MPa traço 1:2,3:2,7 (cimento/areia média/brita 1) - preparo mecânico com betoneira 400L', 'm³', 'SP', '2026-05-01', true, 850.00),
  ('94965', 'Concreto fck=25 MPa traço 1:2,3:2,7 (cimento/areia média/brita 1) - preparo mecânico com betoneira 400L', 'm³', 'SP', '2026-05-01', false, 875.50),

  -- ============= ALVENARIA / REVESTIMENTO ARGAMASSA =============
  ('103328', 'Alvenaria de vedação blocos cerâmicos furados horizontal 9x19x19cm (espessura 9cm) com argamassa em betoneira', 'm²', 'SP', '2026-05-01', true, 135.00),
  ('103328', 'Alvenaria de vedação blocos cerâmicos furados horizontal 9x19x19cm (espessura 9cm) com argamassa em betoneira', 'm²', 'SP', '2026-05-01', false, 139.10),

  ('87878', 'Chapisco aplicado em alvenarias e estruturas de concreto internas, colher de pedreiro, argamassa traço 1:3 com preparo manual', 'm²', 'SP', '2026-05-01', true, 18.50),
  ('87878', 'Chapisco aplicado em alvenarias e estruturas de concreto internas, colher de pedreiro, argamassa traço 1:3 com preparo manual', 'm²', 'SP', '2026-05-01', false, 19.05),

  ('87905', 'Chapisco aplicado em alvenaria e estruturas de concreto de fachada, colher de pedreiro, argamassa traço 1:3 com betoneira 400L', 'm²', 'SP', '2026-05-01', true, 22.00),
  ('87905', 'Chapisco aplicado em alvenaria e estruturas de concreto de fachada, colher de pedreiro, argamassa traço 1:3 com betoneira 400L', 'm²', 'SP', '2026-05-01', false, 22.65),

  ('87529', 'Massa única (emboço) interna 20mm, argamassa traço 1:2:8, preparo mecânico betoneira 400L, aplicada manualmente', 'm²', 'SP', '2026-05-01', true, 48.00),
  ('87529', 'Massa única (emboço) interna 20mm, argamassa traço 1:2:8, preparo mecânico betoneira 400L, aplicada manualmente', 'm²', 'SP', '2026-05-01', false, 49.45),

  ('87530', 'Reboco em parede com argamassa traço 1:6 (cimento/areia/aditivo plastificante), espessura 2cm', 'm²', 'SP', '2026-05-01', true, 58.00),
  ('87530', 'Reboco em parede com argamassa traço 1:6 (cimento/areia/aditivo plastificante), espessura 2cm', 'm²', 'SP', '2026-05-01', false, 59.75),

  -- ============= COBERTURA =============
  ('94195', 'Telhamento com telha cerâmica de encaixe, tipo portuguesa, com até 2 águas', 'm²', 'SP', '2026-05-01', true, 85.00),
  ('94195', 'Telhamento com telha cerâmica de encaixe, tipo portuguesa, com até 2 águas', 'm²', 'SP', '2026-05-01', false, 87.55),

  ('96109', 'Forro em placas de gesso (60x60cm, espessura 12mm) para ambientes residenciais', 'm²', 'SP', '2026-05-01', true, 98.00),
  ('96109', 'Forro em placas de gesso (60x60cm, espessura 12mm) para ambientes residenciais', 'm²', 'SP', '2026-05-01', false, 100.95),

  -- ============= ESQUADRIAS =============
  ('90845', 'Kit porta de madeira para pintura, semi-oca (pesada ou superpesada), padrão médio, 80x210cm, espessura 3,5cm (com batente, dobradiças, fechadura)', 'un', 'SP', '2026-05-01', true, 680.00),
  ('90845', 'Kit porta de madeira para pintura, semi-oca (pesada ou superpesada), padrão médio, 80x210cm, espessura 3,5cm (com batente, dobradiças, fechadura)', 'un', 'SP', '2026-05-01', false, 700.40),

  ('94573', 'Janela de alumínio de correr 4 folhas para vidros, com bandeira, dimensões 150x120cm (batente 6-14cm, vedação silicone, vidros inclusos)', 'un', 'SP', '2026-05-01', true, 1100.00),
  ('94573', 'Janela de alumínio de correr 4 folhas para vidros, com bandeira, dimensões 150x120cm (batente 6-14cm, vedação silicone, vidros inclusos)', 'un', 'SP', '2026-05-01', false, 1133.00),

  ('94569', 'Janela de alumínio tipo maxim-ar 60x80cm (batente 3-14cm, vidro incluso, vedação silicone)', 'un', 'SP', '2026-05-01', true, 390.00),
  ('94569', 'Janela de alumínio tipo maxim-ar 60x80cm (batente 3-14cm, vidro incluso, vedação silicone)', 'un', 'SP', '2026-05-01', false, 401.70),

  -- ============= PISOS E REVESTIMENTOS =============
  ('87622', 'Contrapiso em argamassa traço 1:4 (cimento e areia), preparo manual, aplicado em áreas secas sobre laje, aderido, 2cm', 'm²', 'SP', '2026-05-01', true, 58.00),
  ('87622', 'Contrapiso em argamassa traço 1:4 (cimento e areia), preparo manual, aplicado em áreas secas sobre laje, aderido, 2cm', 'm²', 'SP', '2026-05-01', false, 59.75),

  ('87248', 'Revestimento cerâmico para piso, placas tipo esmaltada de 35x35cm, aplicada em ambientes de área maior que 10m²', 'm²', 'SP', '2026-05-01', true, 95.00),
  ('87248', 'Revestimento cerâmico para piso, placas tipo esmaltada de 35x35cm, aplicada em ambientes de área maior que 10m²', 'm²', 'SP', '2026-05-01', false, 97.85),

  ('87265', 'Revestimento cerâmico para paredes internas, placas tipo esmaltada de 20x20cm, aplicadas na altura inteira', 'm²', 'SP', '2026-05-01', true, 118.00),
  ('87265', 'Revestimento cerâmico para paredes internas, placas tipo esmaltada de 20x20cm, aplicadas na altura inteira', 'm²', 'SP', '2026-05-01', false, 121.55),

  -- ============= PINTURA =============
  ('88485', 'Fundo selador acrílico, aplicação manual em parede, uma demão', 'm²', 'SP', '2026-05-01', true, 15.00),
  ('88485', 'Fundo selador acrílico, aplicação manual em parede, uma demão', 'm²', 'SP', '2026-05-01', false, 15.45),

  ('88497', 'Emassamento com massa látex, aplicação em parede, duas demãos, lixamento manual', 'm²', 'SP', '2026-05-01', true, 32.00),
  ('88497', 'Emassamento com massa látex, aplicação em parede, duas demãos, lixamento manual', 'm²', 'SP', '2026-05-01', false, 32.95),

  ('88489', 'Pintura látex acrílica premium, aplicação manual em paredes, duas demãos', 'm²', 'SP', '2026-05-01', true, 42.50),
  ('88489', 'Pintura látex acrílica premium, aplicação manual em paredes, duas demãos', 'm²', 'SP', '2026-05-01', false, 43.75),

  -- ============= INSTALAÇÕES ELÉTRICAS =============
  ('104473', 'Composição paramétrica de ponto elétrico de iluminação, com interruptor simples, edifício residencial com eletroduto embutido em rasgos nas paredes (incluso tomada, eletroduto, cabo, rasgo, chumbamento)', 'un', 'SP', '2026-05-01', true, 185.00),
  ('104473', 'Composição paramétrica de ponto elétrico de iluminação, com interruptor simples, edifício residencial com eletroduto embutido em rasgos nas paredes (incluso tomada, eletroduto, cabo, rasgo, chumbamento)', 'un', 'SP', '2026-05-01', false, 190.55),

  ('104480', 'Composição paramétrica de ponto elétrico de uso específico 2P+T (20A/250V), edifício residencial com eletroduto embutido em rasgos nas paredes', 'un', 'SP', '2026-05-01', true, 220.00),
  ('104480', 'Composição paramétrica de ponto elétrico de uso específico 2P+T (20A/250V), edifício residencial com eletroduto embutido em rasgos nas paredes', 'un', 'SP', '2026-05-01', false, 226.60),

  -- ============= INSTALAÇÕES HIDRÁULICAS =============
  ('104660', 'Conjunto de pontos hidráulicos de água fria para banheiro (ramal/sub-ramal e distribuição) em PVC, com tubos, conexões, registros, cortes e fixações em prédio com tubulações embutidas com rasgo', 'un', 'SP', '2026-05-01', true, 1850.00),
  ('104660', 'Conjunto de pontos hidráulicos de água fria para banheiro (ramal/sub-ramal e distribuição) em PVC, com tubos, conexões, registros, cortes e fixações em prédio com tubulações embutidas com rasgo', 'un', 'SP', '2026-05-01', false, 1905.50),

  ('104662', 'Conjunto de pontos hidráulicos de água fria para área de serviço (ramal/sub-ramal e distribuição) em PVC, com tubos, conexões, registros, cortes e fixações em prédio com tubulações embutidas com rasgo', 'un', 'SP', '2026-05-01', true, 950.00),
  ('104662', 'Conjunto de pontos hidráulicos de água fria para área de serviço (ramal/sub-ramal e distribuição) em PVC, com tubos, conexões, registros, cortes e fixações em prédio com tubulações embutidas com rasgo', 'un', 'SP', '2026-05-01', false, 978.50),

  -- ============= LOUÇAS E METAIS =============
  ('86931', 'Vaso sanitário sifonado com caixa acoplada, louça branca, incluso engate flexível em plástico branco 1/2 x 40cm', 'un', 'SP', '2026-05-01', true, 680.00),
  ('86931', 'Vaso sanitário sifonado com caixa acoplada, louça branca, incluso engate flexível em plástico branco 1/2 x 40cm', 'un', 'SP', '2026-05-01', false, 700.40),

  ('86939', 'Lavatório louça branca com coluna, 44x35,5cm, padrão popular, incluso sifão flexível PVC, válvula, engate flexível 30cm, torneira cromada', 'un', 'SP', '2026-05-01', true, 420.00),
  ('86939', 'Lavatório louça branca com coluna, 44x35,5cm, padrão popular, incluso sifão flexível PVC, válvula, engate flexível 30cm, torneira cromada', 'un', 'SP', '2026-05-01', false, 432.60);
