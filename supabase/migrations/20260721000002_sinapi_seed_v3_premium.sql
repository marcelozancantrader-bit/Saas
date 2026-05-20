-- =============================================
-- Memorial.ai — Seed v3 adicional: códigos SINAPI premium pra padrão alto/luxo
--
-- Pra padrões alto e luxo, as regras v3 escolhem códigos SINAPI premium
-- (porcelanato em vez de cerâmico, porta maciça em vez de semi-oca, etc) em
-- vez de só multiplicar o preço do código popular.
--
-- Adiciona dois códigos novos:
--   - 87263: Revestimento cerâmico de piso porcelanato 60x60
--   - 100693: Kit porta de madeira maciça tipo mexicana 80x210
--
-- Preços UF=SP 2026-05-01 com mão de obra completa (composições aferidas).
-- =============================================

insert into public.sinapi_compositions (codigo, descricao, unidade, uf, mes_referencia, desonerado, preco)
values
  ('87263', 'Revestimento cerâmico para piso, placas tipo porcelanato de 60x60cm, aplicada em ambientes de área maior que 10m²', 'm²', 'SP', '2026-05-01', true, 165.00),
  ('87263', 'Revestimento cerâmico para piso, placas tipo porcelanato de 60x60cm, aplicada em ambientes de área maior que 10m²', 'm²', 'SP', '2026-05-01', false, 169.95),

  ('100693', 'Kit porta de madeira tipo mexicana, maciça (pesada ou superpesada), padrão médio, 80x210cm, espessura 3,5cm (com batente, dobradiças, fechadura)', 'un', 'SP', '2026-05-01', true, 1350.00),
  ('100693', 'Kit porta de madeira tipo mexicana, maciça (pesada ou superpesada), padrão médio, 80x210cm, espessura 3,5cm (com batente, dobradiças, fechadura)', 'un', 'SP', '2026-05-01', false, 1390.50)
on conflict (codigo, uf, mes_referencia, desonerado) do nothing;
