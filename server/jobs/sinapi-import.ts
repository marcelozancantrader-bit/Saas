import "server-only";
import { inngest } from "@/lib/inngest/client";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * SINAPI importer — STUB.
 *
 * Roda no 1º dia útil de cada mês, baixa o XLSX oficial do SINAPI da Caixa,
 * parseia e popula `sinapi_compositions` com a referência do mês.
 *
 * Status atual: stub não-implementado. Sprint 4 usa seed curado em
 * supabase/migrations/20260524000002_sinapi_seed_curated.sql (~30 composições
 * mais comuns). Implementação real:
 *   1. Determinar URL do XLSX SINAPI mais recente (lista pública na Caixa)
 *   2. Fazer fetch do arquivo (~10 MB)
 *   3. Parsear com `xlsx` (já instalado), iterar por linhas, extrair por UF
 *   4. Bulk upsert em sinapi_compositions (ON CONFLICT (codigo, uf, mes_referencia, desonerado))
 *   5. Logar quantidade importada, atualizar metadata
 *
 * Por que stub: a estrutura do XLSX da Caixa varia mensalmente e precisa
 * curadoria manual antes de cada importação. O job real será habilitado
 * quando tivermos o parser robusto.
 */
export const importSinapi = inngest.createFunction(
  {
    id: "import-sinapi",
    name: "Importar tabela SINAPI mensal",
    retries: 2,
    concurrency: { limit: 1 },
    triggers: [
      // Cron: 1º dia útil de cada mês às 03:00 UTC (00:00 BRT). Inngest avalia o cron como UTC.
      // Para "1º dia útil" exato, precisaríamos checar feriado/fim-de-semana no handler — fora do
      // escopo do stub. Por ora roda no 1º dia do mês (qualquer que seja).
      { cron: "0 3 1 * *" },
      // Manual: permite acionar via Inngest dashboard
      { event: "sinapi.import.requested" },
    ],
  },
  async ({ event, logger }) => {
    logger.warn("SINAPI importer is a stub — nothing imported.");
    logger.info("Triggered by:", event.name);
    const admin = createAdminClient();
    // Sanity: confirma que temos seed curado disponível
    const { count } = await admin
      .from("sinapi_compositions")
      .select("codigo", { count: "exact", head: true });
    logger.info(`Currently ${count ?? 0} compositions in sinapi_compositions table.`);
    return {
      stub: true,
      message:
        "Importer não implementado. Sprint 4 usa seed curado em supabase/migrations/. Implementar parser real antes de habilitar.",
      current_compositions: count ?? 0,
    };
  },
);
