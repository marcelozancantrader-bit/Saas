-- =============================================
-- Memorial.ai — Rules v2: atualiza preços SINAPI para composições completas com MO
--
-- Os preços do seed original (Sprint 4, 2026-05-24) refletiam apenas material ou
-- composição parcial. O resultado: orçamentos saindo ~50% abaixo do mercado.
-- Engenheiro reportou: 130m² popular real R$250-300k, sistema dava R$138k.
--
-- Este UPDATE alinha preços com SINAPI 2025/2026 composições completas (material +
-- mão de obra + encargos). Aplicado em UF=SP, mes_referencia=2026-05-01, ambos
-- regimes desonerado/não-desonerado.
--
-- Orçamentos antigos não são afetados — budget_items grava snapshot de preço.
-- =============================================

-- ============= MOVIMENTO DE TERRA / FUNDAÇÃO =============
update public.sinapi_compositions set preco = 110.00
  where codigo = '73964/001' and uf = 'SP' and mes_referencia = '2026-05-01' and desonerado = true;
update public.sinapi_compositions set preco = 113.50
  where codigo = '73964/001' and uf = 'SP' and mes_referencia = '2026-05-01' and desonerado = false;

update public.sinapi_compositions set preco = 520.00
  where codigo = '74157/004' and uf = 'SP' and mes_referencia = '2026-05-01' and desonerado = true;
update public.sinapi_compositions set preco = 536.00
  where codigo = '74157/004' and uf = 'SP' and mes_referencia = '2026-05-01' and desonerado = false;

update public.sinapi_compositions set preco = 780.00
  where codigo = '92873' and uf = 'SP' and mes_referencia = '2026-05-01' and desonerado = true;
update public.sinapi_compositions set preco = 803.00
  where codigo = '92873' and uf = 'SP' and mes_referencia = '2026-05-01' and desonerado = false;

update public.sinapi_compositions set preco = 17.50
  where codigo = '92775' and uf = 'SP' and mes_referencia = '2026-05-01' and desonerado = true;
update public.sinapi_compositions set preco = 18.00
  where codigo = '92775' and uf = 'SP' and mes_referencia = '2026-05-01' and desonerado = false;

-- ============= ALVENARIA =============
update public.sinapi_compositions set preco = 118.00
  where codigo = '87878' and uf = 'SP' and mes_referencia = '2026-05-01' and desonerado = true;
update public.sinapi_compositions set preco = 121.50
  where codigo = '87878' and uf = 'SP' and mes_referencia = '2026-05-01' and desonerado = false;

update public.sinapi_compositions set preco = 18.50
  where codigo = '87559' and uf = 'SP' and mes_referencia = '2026-05-01' and desonerado = true;
update public.sinapi_compositions set preco = 19.10
  where codigo = '87559' and uf = 'SP' and mes_referencia = '2026-05-01' and desonerado = false;

update public.sinapi_compositions set preco = 46.00
  where codigo = '87529' and uf = 'SP' and mes_referencia = '2026-05-01' and desonerado = true;
update public.sinapi_compositions set preco = 47.40
  where codigo = '87529' and uf = 'SP' and mes_referencia = '2026-05-01' and desonerado = false;

update public.sinapi_compositions set preco = 54.00
  where codigo = '87530' and uf = 'SP' and mes_referencia = '2026-05-01' and desonerado = true;
update public.sinapi_compositions set preco = 55.60
  where codigo = '87530' and uf = 'SP' and mes_referencia = '2026-05-01' and desonerado = false;

-- ============= COBERTURA =============
update public.sinapi_compositions set preco = 138.00
  where codigo = '92799' and uf = 'SP' and mes_referencia = '2026-05-01' and desonerado = true;
update public.sinapi_compositions set preco = 142.00
  where codigo = '92799' and uf = 'SP' and mes_referencia = '2026-05-01' and desonerado = false;

update public.sinapi_compositions set preco = 72.00
  where codigo = '73838/001' and uf = 'SP' and mes_referencia = '2026-05-01' and desonerado = true;
update public.sinapi_compositions set preco = 74.20
  where codigo = '73838/001' and uf = 'SP' and mes_referencia = '2026-05-01' and desonerado = false;

update public.sinapi_compositions set preco = 98.00
  where codigo = '89800' and uf = 'SP' and mes_referencia = '2026-05-01' and desonerado = true;
update public.sinapi_compositions set preco = 101.00
  where codigo = '89800' and uf = 'SP' and mes_referencia = '2026-05-01' and desonerado = false;

-- ============= ESQUADRIAS =============
update public.sinapi_compositions set preco = 680.00
  where codigo = '90443' and uf = 'SP' and mes_referencia = '2026-05-01' and desonerado = true;
update public.sinapi_compositions set preco = 700.50
  where codigo = '90443' and uf = 'SP' and mes_referencia = '2026-05-01' and desonerado = false;

update public.sinapi_compositions set preco = 1450.00
  where codigo = '90445' and uf = 'SP' and mes_referencia = '2026-05-01' and desonerado = true;
update public.sinapi_compositions set preco = 1493.50
  where codigo = '90445' and uf = 'SP' and mes_referencia = '2026-05-01' and desonerado = false;

update public.sinapi_compositions set preco = 485.00
  where codigo = '91173' and uf = 'SP' and mes_referencia = '2026-05-01' and desonerado = true;
update public.sinapi_compositions set preco = 499.60
  where codigo = '91173' and uf = 'SP' and mes_referencia = '2026-05-01' and desonerado = false;

update public.sinapi_compositions set preco = 1050.00
  where codigo = '91174' and uf = 'SP' and mes_referencia = '2026-05-01' and desonerado = true;
update public.sinapi_compositions set preco = 1081.50
  where codigo = '91174' and uf = 'SP' and mes_referencia = '2026-05-01' and desonerado = false;

-- ============= PISOS E REVESTIMENTOS =============
update public.sinapi_compositions set preco = 78.00
  where codigo = '87905' and uf = 'SP' and mes_referencia = '2026-05-01' and desonerado = true;
update public.sinapi_compositions set preco = 80.30
  where codigo = '87905' and uf = 'SP' and mes_referencia = '2026-05-01' and desonerado = false;

update public.sinapi_compositions set preco = 112.00
  where codigo = '87265' and uf = 'SP' and mes_referencia = '2026-05-01' and desonerado = true;
update public.sinapi_compositions set preco = 115.40
  where codigo = '87265' and uf = 'SP' and mes_referencia = '2026-05-01' and desonerado = false;

update public.sinapi_compositions set preco = 118.00
  where codigo = '87527' and uf = 'SP' and mes_referencia = '2026-05-01' and desonerado = true;
update public.sinapi_compositions set preco = 121.50
  where codigo = '87527' and uf = 'SP' and mes_referencia = '2026-05-01' and desonerado = false;

-- ============= PINTURA =============
update public.sinapi_compositions set preco = 29.00
  where codigo = '88488' and uf = 'SP' and mes_referencia = '2026-05-01' and desonerado = true;
update public.sinapi_compositions set preco = 29.90
  where codigo = '88488' and uf = 'SP' and mes_referencia = '2026-05-01' and desonerado = false;

update public.sinapi_compositions set preco = 42.50
  where codigo = '88489' and uf = 'SP' and mes_referencia = '2026-05-01' and desonerado = true;
update public.sinapi_compositions set preco = 43.80
  where codigo = '88489' and uf = 'SP' and mes_referencia = '2026-05-01' and desonerado = false;

update public.sinapi_compositions set preco = 48.50
  where codigo = '88500' and uf = 'SP' and mes_referencia = '2026-05-01' and desonerado = true;
update public.sinapi_compositions set preco = 49.95
  where codigo = '88500' and uf = 'SP' and mes_referencia = '2026-05-01' and desonerado = false;

-- ============= INSTALAÇÕES ELÉTRICAS =============
update public.sinapi_compositions set preco = 195.00
  where codigo = '91296' and uf = 'SP' and mes_referencia = '2026-05-01' and desonerado = true;
update public.sinapi_compositions set preco = 200.80
  where codigo = '91296' and uf = 'SP' and mes_referencia = '2026-05-01' and desonerado = false;

update public.sinapi_compositions set preco = 540.00
  where codigo = '91295' and uf = 'SP' and mes_referencia = '2026-05-01' and desonerado = true;
update public.sinapi_compositions set preco = 556.20
  where codigo = '91295' and uf = 'SP' and mes_referencia = '2026-05-01' and desonerado = false;

-- ============= INSTALAÇÕES HIDRÁULICAS =============
update public.sinapi_compositions set preco = 1080.00
  where codigo = '89711' and uf = 'SP' and mes_referencia = '2026-05-01' and desonerado = true;
update public.sinapi_compositions set preco = 1112.40
  where codigo = '89711' and uf = 'SP' and mes_referencia = '2026-05-01' and desonerado = false;

update public.sinapi_compositions set preco = 250.00
  where codigo = '89351' and uf = 'SP' and mes_referencia = '2026-05-01' and desonerado = true;
update public.sinapi_compositions set preco = 257.50
  where codigo = '89351' and uf = 'SP' and mes_referencia = '2026-05-01' and desonerado = false;

update public.sinapi_compositions set preco = 290.00
  where codigo = '89352' and uf = 'SP' and mes_referencia = '2026-05-01' and desonerado = true;
update public.sinapi_compositions set preco = 298.70
  where codigo = '89352' and uf = 'SP' and mes_referencia = '2026-05-01' and desonerado = false;

-- ============= LOUÇAS E METAIS =============
update public.sinapi_compositions set preco = 680.00
  where codigo = '86931' and uf = 'SP' and mes_referencia = '2026-05-01' and desonerado = true;
update public.sinapi_compositions set preco = 700.50
  where codigo = '86931' and uf = 'SP' and mes_referencia = '2026-05-01' and desonerado = false;

update public.sinapi_compositions set preco = 450.00
  where codigo = '86877' and uf = 'SP' and mes_referencia = '2026-05-01' and desonerado = true;
update public.sinapi_compositions set preco = 463.50
  where codigo = '86877' and uf = 'SP' and mes_referencia = '2026-05-01' and desonerado = false;

update public.sinapi_compositions set preco = 625.00
  where codigo = '86905' and uf = 'SP' and mes_referencia = '2026-05-01' and desonerado = true;
update public.sinapi_compositions set preco = 643.80
  where codigo = '86905' and uf = 'SP' and mes_referencia = '2026-05-01' and desonerado = false;
