-- =============================================
-- Memorial.ai — Cor secundária no branding do workspace
-- Permite definir duas cores (primária + secundária) usadas em PDFs/portal/headers.
-- =============================================

alter table public.organizations
  add column if not exists cor_secundaria text;
