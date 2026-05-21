-- =============================================
-- Memorial.ai — SINAPI nacional (todas as 27 UFs)
--
-- Hoje o banco tinha só 27 códigos × SP. Smoke test em RS revelou 6/11 códigos
-- sem preço → orçamento subdimensionado em ~45%.
--
-- Esta migration:
--   1. Garante que os 21 códigos de disciplinas (elétrica/hidráulica/estrutural)
--      estejam em SP (re-aplica seed se faltava)
--   2. Replica TODOS os códigos de SP pras 26 UFs restantes aplicando fator
--      regional sobre os preços (base SE/SP):
--        - SE (RJ/MG/ES): 1.00x  (igual SP)
--        - S  (RS/SC/PR): 1.00x  (mercado similar)
--        - CO (DF/GO/MT/MS): 0.95x
--        - NE (BA/PE/CE/PB/RN/AL/SE/MA/PI): 0.85x
--        - N  (PA/AM/TO/RO/AC/RR/AP): 0.80x
--
-- Resultado: ~48 códigos × 27 UFs × 2 (desonerado/não) = ~2.592 rows
-- Fonte: aproximação regional. Preços SINAPI reais variam por mão de obra
-- local — atualize via /admin quando tiver dados mais precisos por UF.
-- =============================================

-- ============================================================
-- ETAPA 1 — garante códigos de disciplinas em SP
-- (replicação fiel da migration 20260718000002 com ON CONFLICT)
-- ============================================================

insert into public.sinapi_compositions (codigo, descricao, unidade, uf, mes_referencia, desonerado, preco)
values
  -- ELÉTRICA — cabos flexíveis 750V
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

  -- ELÉTRICA — dispositivos
  ('91952', 'Interruptor simples/paralelo, com placa, instalado', 'un', 'SP', '2026-05-01', true, 38.00),
  ('91952', 'Interruptor simples/paralelo, com placa, instalado', 'un', 'SP', '2026-05-01', false, 39.20),
  ('91953', 'Tomada 2P+T 10A, com placa, instalada', 'un', 'SP', '2026-05-01', true, 42.00),
  ('91953', 'Tomada 2P+T 10A, com placa, instalada', 'un', 'SP', '2026-05-01', false, 43.30),
  ('97586', 'Ponto de iluminação (luminária + soquete + lâmpada LED)', 'un', 'SP', '2026-05-01', true, 95.00),
  ('97586', 'Ponto de iluminação (luminária + soquete + lâmpada LED)', 'un', 'SP', '2026-05-01', false, 98.00),
  ('91295', 'Quadro de distribuição embutido até 24 disjuntores DIN', 'un', 'SP', '2026-05-01', true, 580.00),
  ('91295', 'Quadro de distribuição embutido até 24 disjuntores DIN', 'un', 'SP', '2026-05-01', false, 598.00),

  -- ELÉTRICA — proteções
  ('93653', 'Disjuntor termomagnético monopolar 10-32A, padrão DIN', 'un', 'SP', '2026-05-01', true, 36.00),
  ('93653', 'Disjuntor termomagnético monopolar 10-32A, padrão DIN', 'un', 'SP', '2026-05-01', false, 37.10),
  ('93654', 'Disjuntor diferencial residual (DR) bipolar 25A 30mA', 'un', 'SP', '2026-05-01', true, 285.00),
  ('93654', 'Disjuntor diferencial residual (DR) bipolar 25A 30mA', 'un', 'SP', '2026-05-01', false, 294.00),
  ('93655', 'DPS classe II 275V/20kA, instalado no quadro', 'un', 'SP', '2026-05-01', true, 165.00),
  ('93655', 'DPS classe II 275V/20kA, instalado no quadro', 'un', 'SP', '2026-05-01', false, 170.00),

  -- HIDRÁULICA — tubulações
  ('89446', 'Tubo PVC soldável marrom 25mm, com conexões (água fria ramais)', 'm', 'SP', '2026-05-01', true, 18.50),
  ('89446', 'Tubo PVC soldável marrom 25mm, com conexões (água fria ramais)', 'm', 'SP', '2026-05-01', false, 19.10),
  ('89711', 'Tubo PVC soldável marrom 20mm, com conexões', 'm', 'SP', '2026-05-01', true, 14.50),
  ('89711', 'Tubo PVC soldável marrom 20mm, com conexões', 'm', 'SP', '2026-05-01', false, 14.95),
  ('89714', 'Tubo PVC soldável marrom 32mm, com conexões (água fria coluna)', 'm', 'SP', '2026-05-01', true, 24.80),
  ('89714', 'Tubo PVC soldável marrom 32mm, com conexões (água fria coluna)', 'm', 'SP', '2026-05-01', false, 25.55),
  ('89732', 'Tubo PVC esgoto 100mm, com conexões', 'm', 'SP', '2026-05-01', true, 56.00),
  ('89732', 'Tubo PVC esgoto 100mm, com conexões', 'm', 'SP', '2026-05-01', false, 57.70),

  -- HIDRÁULICA — pontos
  ('89351', 'Ponto de água fria (registro + tubulação + conexão)', 'un', 'SP', '2026-05-01', true, 180.00),
  ('89351', 'Ponto de água fria (registro + tubulação + conexão)', 'un', 'SP', '2026-05-01', false, 185.50),
  ('89352', 'Ponto de esgoto (caixa + tubulação + sifão)', 'un', 'SP', '2026-05-01', true, 245.00),
  ('89352', 'Ponto de esgoto (caixa + tubulação + sifão)', 'un', 'SP', '2026-05-01', false, 252.50),

  -- HIDRÁULICA — fossa
  ('74104/001', 'Fossa séptica pré-moldada 1500L, com filtro anaeróbio', 'un', 'SP', '2026-05-01', true, 4500.00),
  ('74104/001', 'Fossa séptica pré-moldada 1500L, com filtro anaeróbio', 'un', 'SP', '2026-05-01', false, 4640.00),

  -- ESTRUTURAL
  ('92479', 'Concreto fck=30 MPa, traço 1:1,9:2,3, lançado em formas', 'm³', 'SP', '2026-05-01', true, 495.00),
  ('92479', 'Concreto fck=30 MPa, traço 1:1,9:2,3, lançado em formas', 'm³', 'SP', '2026-05-01', false, 510.00),
  ('92775', 'Armação de aço CA-50 corte e dobra ø10mm', 'kg', 'SP', '2026-05-01', true, 12.50),
  ('92775', 'Armação de aço CA-50 corte e dobra ø10mm', 'kg', 'SP', '2026-05-01', false, 12.90)
on conflict (codigo, uf, mes_referencia, desonerado) do nothing;

-- ============================================================
-- ETAPA 2 — Replica todos os códigos SP pras 26 UFs restantes
-- Aplica fator regional sobre o preço.
-- ============================================================

do $$
declare
  fator_row record;
begin
  for fator_row in
    select * from (values
      ('AC',0.80),('AL',0.85),('AP',0.80),('AM',0.80),('BA',0.85),
      ('CE',0.85),('DF',0.95),('ES',1.00),('GO',0.95),('MA',0.85),
      ('MT',0.95),('MS',0.95),('MG',1.00),('PA',0.80),('PB',0.85),
      ('PR',1.00),('PE',0.85),('PI',0.85),('RJ',1.00),('RN',0.85),
      ('RS',1.00),('RO',0.80),('RR',0.80),('SC',1.00),('SE',0.85),
      ('TO',0.80)
    ) as t(uf, fator)
  loop
    insert into public.sinapi_compositions
      (codigo, descricao, unidade, uf, mes_referencia, desonerado, preco)
    select
      codigo,
      descricao,
      unidade,
      fator_row.uf,
      mes_referencia,
      desonerado,
      round(preco * fator_row.fator, 2)
    from public.sinapi_compositions
    where uf = 'SP' and mes_referencia = '2026-05-01'
    on conflict (codigo, uf, mes_referencia, desonerado) do nothing;
  end loop;
end $$;

-- ============================================================
-- VALIDAÇÃO — cole isso depois de rodar pra confirmar
-- ============================================================
-- select uf, count(*) as composicoes
--   from public.sinapi_compositions
--   where mes_referencia = '2026-05-01'
--   group by uf order by uf;
--
-- Deve retornar 27 linhas, cada uma com ~96 composições (48 × 2 desonerado).
