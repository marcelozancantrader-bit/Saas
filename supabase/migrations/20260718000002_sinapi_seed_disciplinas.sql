-- =============================================
-- Memorial.ai — Sprint 10: seed SINAPI das disciplinas complementares
-- 16 composições para alimentar o orçamento de elétrica/hidráulica/estrutural.
-- UF=SP, mês de referência 2026-05-01, com versões desonerada e não-desonerada.
-- Preços BRL 2026 (SINAPI 2025 + ~5% inflação).
-- =============================================

insert into public.sinapi_compositions (codigo, descricao, unidade, uf, mes_referencia, desonerado, preco)
values
  -- ============= ELÉTRICA — cabos flexíveis 750V =============
  ('91929', 'Cabo flexível 1,5mm² isolação 750V (iluminação)', 'm', 'SP', '2026-05-01', true, 4.80),
  ('91929', 'Cabo flexível 1,5mm² isolação 750V (iluminação)', 'm', 'SP', '2026-05-01', false, 4.95),
  ('91931', 'Cabo flexível 2,5mm² isolação 750V (tomadas)', 'm', 'SP', '2026-05-01', true, 6.20),
  ('91931', 'Cabo flexível 2,5mm² isolação 750V (tomadas)', 'm', 'SP', '2026-05-01', false, 6.40),
  ('91933', 'Cabo flexível 4mm² isolação 750V (chuveiro/AC)', 'm', 'SP', '2026-05-01', true, 8.80),
  ('91933', 'Cabo flexível 4mm² isolação 750V (chuveiro/AC)', 'm', 'SP', '2026-05-01', false, 9.10),
  ('91934', 'Cabo flexível 6mm² isolação 750V', 'm', 'SP', '2026-05-01', true, 12.50),
  ('91934', 'Cabo flexível 6mm² isolação 750V', 'm', 'SP', '2026-05-01', false, 12.90),
  ('91935', 'Cabo flexível 10mm² isolação 750V', 'm', 'SP', '2026-05-01', true, 19.40),
  ('91935', 'Cabo flexível 10mm² isolação 750V', 'm', 'SP', '2026-05-01', false, 20.00),

  -- ============= ELÉTRICA — dispositivos =============
  ('91952', 'Interruptor simples/paralelo, com placa, instalado', 'un', 'SP', '2026-05-01', true, 38.00),
  ('91952', 'Interruptor simples/paralelo, com placa, instalado', 'un', 'SP', '2026-05-01', false, 39.20),
  ('91953', 'Tomada 2P+T 10A, com placa, instalada', 'un', 'SP', '2026-05-01', true, 42.00),
  ('91953', 'Tomada 2P+T 10A, com placa, instalada', 'un', 'SP', '2026-05-01', false, 43.30),
  ('97586', 'Ponto de iluminação (luminária + soquete + lâmpada LED)', 'un', 'SP', '2026-05-01', true, 95.00),
  ('97586', 'Ponto de iluminação (luminária + soquete + lâmpada LED)', 'un', 'SP', '2026-05-01', false, 98.00),

  -- ============= ELÉTRICA — proteções no quadro =============
  ('93653', 'Disjuntor termomagnético monopolar 10-32A, padrão DIN', 'un', 'SP', '2026-05-01', true, 36.00),
  ('93653', 'Disjuntor termomagnético monopolar 10-32A, padrão DIN', 'un', 'SP', '2026-05-01', false, 37.10),
  ('93654', 'Disjuntor diferencial residual (DR) bipolar 25A 30mA', 'un', 'SP', '2026-05-01', true, 285.00),
  ('93654', 'Disjuntor diferencial residual (DR) bipolar 25A 30mA', 'un', 'SP', '2026-05-01', false, 294.00),
  ('93655', 'DPS classe II 275V/20kA, instalado no quadro', 'un', 'SP', '2026-05-01', true, 165.00),
  ('93655', 'DPS classe II 275V/20kA, instalado no quadro', 'un', 'SP', '2026-05-01', false, 170.00),

  -- ============= HIDRÁULICA — tubulações =============
  ('89446', 'Tubo PVC soldável marrom 25mm, com conexões (água fria ramais)', 'm', 'SP', '2026-05-01', true, 18.50),
  ('89446', 'Tubo PVC soldável marrom 25mm, com conexões (água fria ramais)', 'm', 'SP', '2026-05-01', false, 19.10),
  ('89714', 'Tubo PVC soldável marrom 32mm, com conexões (água fria coluna)', 'm', 'SP', '2026-05-01', true, 24.80),
  ('89714', 'Tubo PVC soldável marrom 32mm, com conexões (água fria coluna)', 'm', 'SP', '2026-05-01', false, 25.55),
  ('89732', 'Tubo PVC esgoto 100mm, com conexões', 'm', 'SP', '2026-05-01', true, 56.00),
  ('89732', 'Tubo PVC esgoto 100mm, com conexões', 'm', 'SP', '2026-05-01', false, 57.70),

  -- ============= HIDRÁULICA — tratamento de esgoto =============
  ('74104/001', 'Fossa séptica pré-moldada 1500L, com filtro anaeróbio', 'un', 'SP', '2026-05-01', true, 4500.00),
  ('74104/001', 'Fossa séptica pré-moldada 1500L, com filtro anaeróbio', 'un', 'SP', '2026-05-01', false, 4640.00),

  -- ============= ESTRUTURAL — concreto fck > 25 MPa =============
  ('92479', 'Concreto fck=30 MPa, traço 1:1,9:2,3, lançado em formas', 'm³', 'SP', '2026-05-01', true, 495.00),
  ('92479', 'Concreto fck=30 MPa, traço 1:1,9:2,3, lançado em formas', 'm³', 'SP', '2026-05-01', false, 510.00)
on conflict (codigo, uf, mes_referencia, desonerado) do nothing;
