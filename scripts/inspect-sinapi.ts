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
  // 1. Count por UF + mês
  const { data: ufs } = await supabase
    .from("sinapi_compositions")
    .select("uf, mes_referencia, desonerado")
    .order("uf");
  if (!ufs) {
    console.error("Sem dados de sinapi_compositions");
    return;
  }
  type Row = { uf: string; mes_referencia: string; desonerado: boolean };
  const rows = ufs as Row[];
  console.log(`Total rows: ${rows.length}`);

  const byKey = new Map<string, number>();
  for (const r of rows) {
    const k = `${r.uf}|${r.mes_referencia}|${r.desonerado ? "des" : "ndes"}`;
    byKey.set(k, (byKey.get(k) ?? 0) + 1);
  }
  console.log("Por UF/mês/desonerado:");
  for (const [k, c] of [...byKey.entries()].sort()) {
    console.log(`  ${k}: ${c} composições`);
  }

  // 2. Distinct UFs
  const distinctUFs = [...new Set(rows.map((r) => r.uf))].sort();
  console.log(`\nUFs cadastradas (${distinctUFs.length}): ${distinctUFs.join(", ")}`);

  // 3. Distinct meses
  const distinctMeses = [...new Set(rows.map((r) => r.mes_referencia))].sort();
  console.log(`Meses de referência: ${distinctMeses.join(", ")}`);

  // 4. Códigos
  const { data: codes } = await supabase
    .from("sinapi_compositions")
    .select("codigo, descricao, unidade, preco, uf")
    .eq("uf", "SP")
    .eq("mes_referencia", "2026-05-01")
    .eq("desonerado", true);
  console.log(`\nCódigos com preço em SP/2026-05/desonerado: ${codes?.length ?? 0}`);
  for (const c of (codes ?? []).slice(0, 10) as {
    codigo: string;
    descricao: string;
    preco: string;
  }[]) {
    console.log(`  ${c.codigo} — ${c.descricao.slice(0, 60)} — R$ ${c.preco}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
