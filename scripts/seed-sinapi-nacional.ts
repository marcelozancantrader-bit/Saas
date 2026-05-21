/**
 * Seed SINAPI nacional — aplica a migration 20260725000002_sinapi_all_ufs.sql
 * via DB URL direta. Idempotente (todos os INSERTs usam ON CONFLICT DO NOTHING).
 *
 * Uso:
 *   set -a && . ./.env.local && set +a && npx tsx scripts/seed-sinapi-nacional.ts
 *   ou no PowerShell:
 *   npx tsx scripts/seed-sinapi-nacional.ts
 *
 * Precisa SUPABASE_DB_URL no .env.local — formato:
 *   postgresql://postgres.<project>:<password>@aws-0-sa-east-1.pooler.supabase.com:6543/postgres
 */

import "dotenv/config";
import postgres from "postgres";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const DB_URL = process.env.SUPABASE_DB_URL;
if (!DB_URL) {
  console.error("❌ SUPABASE_DB_URL não setado. Configure no .env.local primeiro.");
  process.exit(1);
}

const MIGRATION_PATH = join(
  process.cwd(),
  "supabase",
  "migrations",
  "20260725000002_sinapi_all_ufs.sql",
);

async function main() {
  const sql = postgres(DB_URL!, {
    ssl: { rejectUnauthorized: false },
    prepare: false,
    max: 1,
  });

  try {
    console.log("\n📊 Estado ANTES do seed:\n");
    const before = await sql<Array<{ uf: string; composicoes: number }>>`
      SELECT uf, COUNT(*)::int AS composicoes
      FROM public.sinapi_compositions
      WHERE mes_referencia = '2026-05-01'
      GROUP BY uf
      ORDER BY uf;
    `;
    console.table(before);
    console.log(`  Total de UFs: ${before.length} / 27`);

    if (before.length === 27) {
      console.log("\n✅ Já tem 27 UFs cadastradas — nada a fazer.");
      return;
    }

    console.log("\n🚀 Aplicando migration...\n");
    const migrationSql = readFileSync(MIGRATION_PATH, "utf-8");
    await sql.unsafe(migrationSql);
    console.log("  ✓ Migration aplicada (idempotente)");

    console.log("\n📊 Estado DEPOIS do seed:\n");
    const after = await sql<Array<{ uf: string; composicoes: number }>>`
      SELECT uf, COUNT(*)::int AS composicoes
      FROM public.sinapi_compositions
      WHERE mes_referencia = '2026-05-01'
      GROUP BY uf
      ORDER BY uf;
    `;
    console.table(after);
    console.log(`  Total de UFs: ${after.length} / 27`);

    if (after.length === 27) {
      console.log("\n✅ Sucesso! SINAPI nacional completa.");
    } else {
      console.error(`\n⚠️  Esperado 27 UFs, encontrado ${after.length}. Investigue.`);
      process.exit(1);
    }
  } finally {
    await sql.end();
  }
}

main().catch((err) => {
  console.error("\n❌ Erro:", err.message);
  process.exit(1);
});
