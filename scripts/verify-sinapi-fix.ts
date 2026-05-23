/**
 * Valida a correção do bug PostgREST max_rows: confirma que
 * `selectAllRows` pagina e retorna todas as 27 UFs.
 */
import * as dotenv from "dotenv";
import { resolve } from "path";
dotenv.config({ path: resolve(process.cwd(), ".env.local"), override: true });

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

// Reimplementação local de selectAllRows pra rodar fora do "server-only".
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Builder = any;
async function selectAllRows<TRow>(
  client: SupabaseClient,
  build: (s: SupabaseClient) => Builder,
  pageSize = 1000,
): Promise<TRow[]> {
  const all: TRow[] = [];
  let offset = 0;
  for (let i = 0; i < 200; i++) {
    const q = build(client);
    const { data, error } = (await q.range(offset, offset + pageSize - 1)) as {
      data: TRow[] | null;
      error: { message: string } | null;
    };
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < pageSize) break;
    offset += pageSize;
  }
  return all;
}

async function main() {
  console.log("=== selectAllRows com paginação ===\n");
  const rows = await selectAllRows<{ uf: string; mes_referencia: string }>(supabase, (s) =>
    s
      .from("sinapi_compositions")
      .select("uf, mes_referencia")
      .order("uf", { ascending: true })
      .order("mes_referencia", { ascending: false }),
  );

  console.log(`Total rows recuperadas: ${rows.length}`);
  const ufs = [...new Set(rows.map((r) => r.uf))].sort();
  console.log(`UFs distintas (${ufs.length}): ${ufs.join(", ")}`);

  const allExpected = [
    "AC",
    "AL",
    "AM",
    "AP",
    "BA",
    "CE",
    "DF",
    "ES",
    "GO",
    "MA",
    "MG",
    "MS",
    "MT",
    "PA",
    "PB",
    "PE",
    "PI",
    "PR",
    "RJ",
    "RN",
    "RO",
    "RR",
    "RS",
    "SC",
    "SE",
    "SP",
    "TO",
  ];
  const missing = allExpected.filter((u) => !ufs.includes(u));
  if (missing.length === 0) {
    console.log("\nOK — todas as 27 UFs presentes.");
  } else {
    console.log(`\nFALTANDO ${missing.length}: ${missing.join(", ")}`);
  }
}

main().catch((e) => {
  console.error("FATAL:", e);
  process.exit(1);
});
