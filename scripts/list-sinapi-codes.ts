import * as dotenv from "dotenv";
import { resolve } from "path";
dotenv.config({ path: resolve(process.cwd(), ".env.local"), override: true });
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

const USED_CODES = [
  // v3.ts
  "96523",
  "96619",
  "94965",
  "103328",
  "87878",
  "87905",
  "87529",
  "87530",
  "94195",
  "96109",
  "94573",
  "94569",
  "87622",
  "87263",
  "87248",
  "87265",
  "88485",
  "88497",
  "88489",
  "104473",
  "104480",
  "104660",
  "104662",
  "86931",
  "86939",
  "90845",
  "87248",
  // disciplines.v1.ts
  "91929",
  "91931",
  "91933",
  "91934",
  "91935",
  "91952",
  "91953",
  "97586",
  "91295",
  "93653",
  "93654",
  "93655",
  "89446",
  "89714",
  "89732",
  "89351",
  "89352",
  "89711",
  "74104/001",
  "92479",
  "92775",
];

async function main() {
  const { data } = await supabase
    .from("sinapi_compositions")
    .select("codigo, descricao, preco")
    .eq("uf", "SP")
    .eq("mes_referencia", "2026-05-01")
    .eq("desonerado", true);

  const have = new Set((data ?? []).map((r) => r.codigo));
  console.log(`No banco em SP (${have.size}):`);
  for (const c of [...have].sort()) {
    const row = (data ?? []).find((r) => r.codigo === c);
    console.log(`  ${c} — R$ ${row?.preco}`);
  }

  const needed = new Set(USED_CODES);
  const missing = [...needed].filter((c) => !have.has(c)).sort();
  console.log(`\nUsados pelo sistema (${needed.size}): ${[...needed].sort().join(", ")}`);
  console.log(`\n❌ Faltam (${missing.length}): ${missing.join(", ")}`);
}

main().catch(console.error);
