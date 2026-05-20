-- =============================================
-- Memorial.ai — Adiciona campos do profissional responsável em organizations
--
-- ART/RRT precisa de profissional_nome, profissional_cpf e profissional_endereco
-- além dos campos que já existem (registro_cau, registro_crea, cnpj, nome).
-- Antes esses 3 ficavam vazios e o usuário digitava em cada projeto.
--
-- profissional_email já existe em auth.users.email (acessível via org.email).
-- =============================================

alter table public.organizations
  add column if not exists profissional_nome text,
  add column if not exists profissional_cpf text,
  add column if not exists profissional_endereco text;

comment on column public.organizations.profissional_nome is 'Nome completo do profissional responsável (arquiteto/engenheiro) para ART/RRT';
comment on column public.organizations.profissional_cpf is 'CPF do profissional responsável (com máscara XXX.XXX.XXX-XX)';
comment on column public.organizations.profissional_endereco is 'Endereço residencial/escritório do profissional para ART/RRT';
