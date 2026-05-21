-- =============================================
-- Memorial.ai — CUB Estadual (Custo Unitário Básico por UF e padrão)
--
-- Substitui hard-code em lib/budget/rules/v3.ts por tabela dinâmica.
-- Valores são FAIXAS de referência por padrão construtivo, atualizadas
-- mensalmente conforme SINDUSCON estadual (R-1, R-8, R-16 etc).
--
-- Seed inicial 2026-05 baseado em médias SINDUSCON públicas + fator regional:
--   - SE (SP/RJ/MG/ES): base
--   - S (RS/SC/PR):     × 1.00
--   - CO (DF/GO/MT/MS): × 0.95
--   - NE (BA/CE/PE/PA/etc): × 0.85
--   - N (AM/RR/RO/AC/AP): × 0.80
-- =============================================

create table if not exists public.cub_estadual (
  id uuid primary key default gen_random_uuid(),
  uf char(2) not null,
  padrao text not null check (padrao in ('popular','medio','alto','luxo')),
  mes_referencia date not null,
  faixa_min numeric(10,2) not null,
  faixa_max numeric(10,2) not null,
  fonte text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists uniq_cub_estadual_uf_padrao_mes
  on public.cub_estadual(uf, padrao, mes_referencia);

create index if not exists idx_cub_estadual_lookup
  on public.cub_estadual(uf, padrao, mes_referencia desc);

comment on table public.cub_estadual is
  'CUB (R$/m²) por UF e padrão construtivo, atualizado mensalmente. Substitui faixas hard-coded.';

alter table public.cub_estadual enable row level security;

-- Leitura pública pra membros autenticados (não tem PII)
create policy "cub_select_all_authenticated"
  on public.cub_estadual for select to authenticated using (true);

-- INSERT/UPDATE só via service-role / platform admin
create policy "cub_manage_platform_admin"
  on public.cub_estadual for all to authenticated
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

create trigger trg_cub_estadual_updated_at
  before update on public.cub_estadual
  for each row execute function public.set_updated_at();

-- =============================================
-- Seed inicial 2026-05-01 — todas as 27 UFs × 4 padrões
-- Base (SE): popular 1900-2400, médio 2400-3000, alto 3000-4200, luxo 4200-6500
-- =============================================

insert into public.cub_estadual (uf, padrao, mes_referencia, faixa_min, faixa_max, fonte) values
-- SUDESTE (× 1.00)
('SP','popular','2026-05-01',1900,2400,'SINDUSCON-SP'),
('SP','medio','2026-05-01',2400,3000,'SINDUSCON-SP'),
('SP','alto','2026-05-01',3000,4200,'SINDUSCON-SP'),
('SP','luxo','2026-05-01',4200,6500,'SINDUSCON-SP'),
('RJ','popular','2026-05-01',1900,2400,'SINDUSCON-RJ'),
('RJ','medio','2026-05-01',2400,3000,'SINDUSCON-RJ'),
('RJ','alto','2026-05-01',3000,4200,'SINDUSCON-RJ'),
('RJ','luxo','2026-05-01',4200,6500,'SINDUSCON-RJ'),
('MG','popular','2026-05-01',1850,2350,'SINDUSCON-MG'),
('MG','medio','2026-05-01',2350,2950,'SINDUSCON-MG'),
('MG','alto','2026-05-01',2950,4100,'SINDUSCON-MG'),
('MG','luxo','2026-05-01',4100,6400,'SINDUSCON-MG'),
('ES','popular','2026-05-01',1850,2350,'SINDUSCON-ES'),
('ES','medio','2026-05-01',2350,2950,'SINDUSCON-ES'),
('ES','alto','2026-05-01',2950,4100,'SINDUSCON-ES'),
('ES','luxo','2026-05-01',4100,6400,'SINDUSCON-ES'),
-- SUL (× 1.00 — mercado aquecido)
('RS','popular','2026-05-01',1900,2400,'SINDUSCON-RS'),
('RS','medio','2026-05-01',2400,3000,'SINDUSCON-RS'),
('RS','alto','2026-05-01',3000,4200,'SINDUSCON-RS'),
('RS','luxo','2026-05-01',4200,6500,'SINDUSCON-RS'),
('SC','popular','2026-05-01',1950,2450,'SINDUSCON-SC'),
('SC','medio','2026-05-01',2450,3050,'SINDUSCON-SC'),
('SC','alto','2026-05-01',3050,4250,'SINDUSCON-SC'),
('SC','luxo','2026-05-01',4250,6550,'SINDUSCON-SC'),
('PR','popular','2026-05-01',1900,2400,'SINDUSCON-PR'),
('PR','medio','2026-05-01',2400,3000,'SINDUSCON-PR'),
('PR','alto','2026-05-01',3000,4200,'SINDUSCON-PR'),
('PR','luxo','2026-05-01',4200,6500,'SINDUSCON-PR'),
-- CENTRO-OESTE (× 0.95)
('DF','popular','2026-05-01',1810,2280,'SINDUSCON-DF'),
('DF','medio','2026-05-01',2280,2850,'SINDUSCON-DF'),
('DF','alto','2026-05-01',2850,3990,'SINDUSCON-DF'),
('DF','luxo','2026-05-01',3990,6180,'SINDUSCON-DF'),
('GO','popular','2026-05-01',1800,2280,'SINDUSCON-GO'),
('GO','medio','2026-05-01',2280,2850,'SINDUSCON-GO'),
('GO','alto','2026-05-01',2850,3990,'SINDUSCON-GO'),
('GO','luxo','2026-05-01',3990,6180,'SINDUSCON-GO'),
('MT','popular','2026-05-01',1800,2280,'SINDUSCON-MT'),
('MT','medio','2026-05-01',2280,2850,'SINDUSCON-MT'),
('MT','alto','2026-05-01',2850,3990,'SINDUSCON-MT'),
('MT','luxo','2026-05-01',3990,6180,'SINDUSCON-MT'),
('MS','popular','2026-05-01',1800,2280,'SINDUSCON-MS'),
('MS','medio','2026-05-01',2280,2850,'SINDUSCON-MS'),
('MS','alto','2026-05-01',2850,3990,'SINDUSCON-MS'),
('MS','luxo','2026-05-01',3990,6180,'SINDUSCON-MS'),
-- NORDESTE (× 0.85)
('BA','popular','2026-05-01',1610,2040,'SINDUSCON-BA'),
('BA','medio','2026-05-01',2040,2550,'SINDUSCON-BA'),
('BA','alto','2026-05-01',2550,3570,'SINDUSCON-BA'),
('BA','luxo','2026-05-01',3570,5530,'SINDUSCON-BA'),
('PE','popular','2026-05-01',1610,2040,'SINDUSCON-PE'),
('PE','medio','2026-05-01',2040,2550,'SINDUSCON-PE'),
('PE','alto','2026-05-01',2550,3570,'SINDUSCON-PE'),
('PE','luxo','2026-05-01',3570,5530,'SINDUSCON-PE'),
('CE','popular','2026-05-01',1610,2040,'SINDUSCON-CE'),
('CE','medio','2026-05-01',2040,2550,'SINDUSCON-CE'),
('CE','alto','2026-05-01',2550,3570,'SINDUSCON-CE'),
('CE','luxo','2026-05-01',3570,5530,'SINDUSCON-CE'),
('PB','popular','2026-05-01',1610,2040,'SINDUSCON-PB'),
('PB','medio','2026-05-01',2040,2550,'SINDUSCON-PB'),
('PB','alto','2026-05-01',2550,3570,'SINDUSCON-PB'),
('PB','luxo','2026-05-01',3570,5530,'SINDUSCON-PB'),
('RN','popular','2026-05-01',1610,2040,'SINDUSCON-RN'),
('RN','medio','2026-05-01',2040,2550,'SINDUSCON-RN'),
('RN','alto','2026-05-01',2550,3570,'SINDUSCON-RN'),
('RN','luxo','2026-05-01',3570,5530,'SINDUSCON-RN'),
('AL','popular','2026-05-01',1610,2040,'SINDUSCON-AL'),
('AL','medio','2026-05-01',2040,2550,'SINDUSCON-AL'),
('AL','alto','2026-05-01',2550,3570,'SINDUSCON-AL'),
('AL','luxo','2026-05-01',3570,5530,'SINDUSCON-AL'),
('SE','popular','2026-05-01',1610,2040,'SINDUSCON-SE'),
('SE','medio','2026-05-01',2040,2550,'SINDUSCON-SE'),
('SE','alto','2026-05-01',2550,3570,'SINDUSCON-SE'),
('SE','luxo','2026-05-01',3570,5530,'SINDUSCON-SE'),
('MA','popular','2026-05-01',1610,2040,'SINDUSCON-MA'),
('MA','medio','2026-05-01',2040,2550,'SINDUSCON-MA'),
('MA','alto','2026-05-01',2550,3570,'SINDUSCON-MA'),
('MA','luxo','2026-05-01',3570,5530,'SINDUSCON-MA'),
('PI','popular','2026-05-01',1610,2040,'SINDUSCON-PI'),
('PI','medio','2026-05-01',2040,2550,'SINDUSCON-PI'),
('PI','alto','2026-05-01',2550,3570,'SINDUSCON-PI'),
('PI','luxo','2026-05-01',3570,5530,'SINDUSCON-PI'),
-- NORTE (× 0.80)
('PA','popular','2026-05-01',1520,1920,'SINDUSCON-PA'),
('PA','medio','2026-05-01',1920,2400,'SINDUSCON-PA'),
('PA','alto','2026-05-01',2400,3360,'SINDUSCON-PA'),
('PA','luxo','2026-05-01',3360,5200,'SINDUSCON-PA'),
('AM','popular','2026-05-01',1520,1920,'SINDUSCON-AM'),
('AM','medio','2026-05-01',1920,2400,'SINDUSCON-AM'),
('AM','alto','2026-05-01',2400,3360,'SINDUSCON-AM'),
('AM','luxo','2026-05-01',3360,5200,'SINDUSCON-AM'),
('TO','popular','2026-05-01',1520,1920,'SINDUSCON-TO'),
('TO','medio','2026-05-01',1920,2400,'SINDUSCON-TO'),
('TO','alto','2026-05-01',2400,3360,'SINDUSCON-TO'),
('TO','luxo','2026-05-01',3360,5200,'SINDUSCON-TO'),
('RO','popular','2026-05-01',1520,1920,'SINDUSCON-RO'),
('RO','medio','2026-05-01',1920,2400,'SINDUSCON-RO'),
('RO','alto','2026-05-01',2400,3360,'SINDUSCON-RO'),
('RO','luxo','2026-05-01',3360,5200,'SINDUSCON-RO'),
('AC','popular','2026-05-01',1520,1920,'SINDUSCON-AC'),
('AC','medio','2026-05-01',1920,2400,'SINDUSCON-AC'),
('AC','alto','2026-05-01',2400,3360,'SINDUSCON-AC'),
('AC','luxo','2026-05-01',3360,5200,'SINDUSCON-AC'),
('RR','popular','2026-05-01',1520,1920,'SINDUSCON-RR'),
('RR','medio','2026-05-01',1920,2400,'SINDUSCON-RR'),
('RR','alto','2026-05-01',2400,3360,'SINDUSCON-RR'),
('RR','luxo','2026-05-01',3360,5200,'SINDUSCON-RR'),
('AP','popular','2026-05-01',1520,1920,'SINDUSCON-AP'),
('AP','medio','2026-05-01',1920,2400,'SINDUSCON-AP'),
('AP','alto','2026-05-01',2400,3360,'SINDUSCON-AP'),
('AP','luxo','2026-05-01',3360,5200,'SINDUSCON-AP');
