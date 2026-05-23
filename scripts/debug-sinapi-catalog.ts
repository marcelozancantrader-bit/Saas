/**
 * Reproduz exatamente o que `loadSinapiCatalog` faz em prod, com a mesma
 * query (`.range(0, 99999)`), pra confirmar se o banco realmente tem 27 UFs.
 */
import * as dotenv from "dotenv";
import { resolve } from "path";
dotenv.config({ path: resolve(process.cwd(), ".env.local"), override: true });

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

async function main() {
  console.log("=== Query EXATA do loadSinapiCatalog ===\n");

  const { data, error, count } = await supabase
    .from("sinapi_compositions")
    .select("uf, mes_referencia", { count: "exact" })
    .order("uf", { ascending: true })
    .order("mes_referencia", { ascending: false })
    .range(0, 99999);

  if (error) {
    console.error("ERRO:", error);
    return;
  }

  console.log(`Total rows retornadas: ${data?.length ?? 0}`);
  console.log(`Count exato: ${count}`);

  if (!data || data.length === 0) {
    console.log("BANCO ESTÁ VAZIO.");
    return;
  }

  const ufs = [...new Set(data.map((r: { uf: string }) => r.uf))].sort();
  console.log(`\nUFs distintas (${ufs.length}): ${ufs.join(", ")}`);

  const meses = [...new Set(data.map((r: { mes_referencia: string }) => r.mes_referencia))].sort();
  console.log(`Meses distintos: ${meses.join(", ")}`);

  console.log("\n=== Contagem por UF ===");
  const byUf = new Map<string, number>();
  for (const r of data as { uf: string }[]) {
    byUf.set(r.uf, (byUf.get(r.uf) ?? 0) + 1);
  }
  for (const uf of ufs) {
    console.log(`  ${uf}: ${byUf.get(uf)} rows`);
  }

  console.log("\n=== Specifically RS ===");
  const { data: rs, error: rsErr } = await supabase
    .from("sinapi_compositions")
    .select("codigo, descricao, preco")
    .eq("uf", "RS")
    .eq("mes_referencia", "2026-05-01")
    .eq("desonerado", true)
    .limit(5);
  if (rsErr) console.error("RS query erro:", rsErr);
  console.log(`RS encontradas: ${rs?.length ?? 0}`);
  for (const r of rs ?? []) {
    console.log(`  ${(r as { codigo: string }).codigo}: R$ ${(r as { preco: string }).preco}`);
  }
}

main().catch((e) => {
  console.error("FATAL:", e);
  process.exit(1);
});
