-- =============================================
-- Memorial.ai — Tier B: zoneamento por cidade
--
-- Adiciona campos em projects para fazer pré-validação de zoneamento
-- (taxa de ocupação, coeficiente, recuos, altura, vagas) contra regras
-- curadas das 5 maiores capitais (V0):
--   - Curitiba (Lei 9.800/2000)
--   - São Paulo (Lei 16.402/2016)
--   - Porto Alegre (PDDUA)
--   - Rio de Janeiro (Plano Diretor)
--   - Belo Horizonte (Plano Diretor)
--
-- Não substitui o projeto legal aprovado pela prefeitura — apenas
-- pré-validação para reduzir retrabalho.
-- =============================================

alter table public.projects
  add column if not exists cidade_codigo text,
  add column if not exists zoneamento text,
  add column if not exists area_terreno_m2 numeric(10, 2);

comment on column public.projects.cidade_codigo is
  'Código da cidade pra validação zoneamento (curitiba, sao_paulo, porto_alegre, rio_de_janeiro, belo_horizonte). Curated list em lib/zoneamento/cidades.ts';
comment on column public.projects.zoneamento is
  'Código da zona dentro da cidade (ex: SP zm-1, Curitiba zr-2, POA mua). Curated em lib/zoneamento/cidades.ts';
comment on column public.projects.area_terreno_m2 is
  'Área do lote em m² — base para cálculo de taxa de ocupação e coeficiente de aproveitamento.';
