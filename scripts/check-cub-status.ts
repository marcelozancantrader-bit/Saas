/**
 * Mostra o estado da tabela cub_estadual em prod.
 * Uso: npx tsx scripts/check-cub-status.ts
 */

import "dotenv/config";
import postgres from "postgres";

const DB_URL = process.env.SUPABASE_DB_URL;
if (!DB_URL) {
  console.error("❌ SUPABASE_DB_URL não setado.");
  process.exit(1);
}

async function main() {
  const sql = postgres(DB_URL!, {
    ssl: { rejectUnauthorized: false },
    prepare: false,
    max: 1,
  });

  try {
    const total = await sql<Array<{ count: number }>>`
      SELECT COUNT(*)::int AS count FROM public.cub_estadual;
    `;
    console.log(
      `\n📊 Total de linhas: ${total[0]?.count ?? 0} (esperado: 108 = 27 UFs × 4 padrões)\n`,
    );

    const matrix = await sql<
      Array<{ uf: string; popular: string; medio: string; alto: string; luxo: string }>
    >`
      SELECT
        uf,
        MAX(CASE WHEN padrao = 'popular' THEN faixa_min || '-' || faixa_max END) AS popular,
        MAX(CASE WHEN padrao = 'medio'   THEN faixa_min || '-' || faixa_max END) AS medio,
        MAX(CASE WHEN padrao = 'alto'    THEN faixa_min || '-' || faixa_max END) AS alto,
        MAX(CASE WHEN padrao = 'luxo'    THEN faixa_min || '-' || faixa_max END) AS luxo
      FROM public.cub_estadual
      GROUP BY uf
      ORDER BY uf;
    `;
    console.table(matrix);

    const meses = await sql<Array<{ mes_referencia: string; count: number }>>`
      SELECT mes_referencia::text, COUNT(*)::int AS count
      FROM public.cub_estadual
      GROUP BY mes_referencia
      ORDER BY mes_referencia DESC;
    `;
    console.log("\n📅 Meses cadastrados:");
    console.table(meses);
  } finally {
    await sql.end();
  }
}

main().catch((err) => {
  console.error("\n❌ Erro:", err.message);
  process.exit(1);
});
