-- Rate limit por janela deslizante (sliding window) via Postgres.
--
-- Strategy: cada chamada protegida insere uma linha com (key, created_at);
-- antes de inserir, conta quantas linhas existem nos últimos N ms.
-- Se >= limit, bloqueia. Falha aberta: se DB falhar, helper deixa passar
-- (proteção a rate-limit não pode derrubar o app).
--
-- Storage barato: cleanup oportunístico no helper + cron diário (futuro).
--
-- Sem RLS policies — só service-role pode ler/escrever (RLS habilitada,
-- zero policies = anon/authenticated bloqueado, service-role bypassa).

CREATE TABLE IF NOT EXISTS rate_limit_events (
  id BIGSERIAL PRIMARY KEY,
  key TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rate_limit_events_key_created
  ON rate_limit_events (key, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_rate_limit_events_created_at
  ON rate_limit_events (created_at);

ALTER TABLE rate_limit_events ENABLE ROW LEVEL SECURITY;

-- Função de cleanup chamada pelo helper (oportunística) e por cron.
-- Apaga eventos mais antigos que 24h — janela máxima usada hoje é 1h,
-- então 24h dá margem de sobra pra debug/auditoria.
CREATE OR REPLACE FUNCTION cleanup_rate_limit_events()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM rate_limit_events WHERE created_at < now() - interval '24 hours';
$$;
