/**
 * Audit RLS — confirma que cada tabela do schema public:
 *   1. Tem RLS habilitada
 *   2. Tem policies adequadas pra operações esperadas
 *
 * Roda contra o banco real (precisa SUPABASE_SERVICE_ROLE_KEY).
 * Uso: `npx tsx scripts/audit-rls.ts`
 *
 * Saída: tabela formatada com 🟢/🟡/🔴 e detalhes de cada tabela.
 */

import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Defina NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY no .env.local");
  process.exit(1);
}

const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

type TableInfo = {
  table_name: string;
  rls_enabled: boolean;
  policies: Array<{
    policyname: string;
    cmd: string;
    roles: string[];
  }>;
};

const ADMIN_ONLY_TABLES = new Set(["rate_limit_events", "audit_log"]);
const READ_ONLY_TABLES = new Set(["sinapi_compositions", "cub_estadual"]);

async function main() {
  const { data, error } = await admin.from("_audit_rls_status").select("*");

  if (error) {
    console.error("Falha ao consultar _audit_rls_status:", error.message);
    console.error(
      "\nVocê precisa aplicar a migration 20260726000002_audit_rls_view.sql no Supabase Dashboard primeiro.",
    );
    process.exit(1);
  }

  const tables = (data ?? []) as TableInfo[];
  let critical = 0;
  let warning = 0;

  console.log("\n=== Audit RLS — Memorial.ai ===\n");

  for (const t of tables) {
    const isAdminOnly = ADMIN_ONLY_TABLES.has(t.table_name);
    const isReadOnly = READ_ONLY_TABLES.has(t.table_name);
    const cmds = new Set(t.policies.map((p) => p.cmd));
    let status: "🟢" | "🟡" | "🔴" = "🟢";
    const notes: string[] = [];

    if (!t.rls_enabled) {
      status = "🔴";
      notes.push("RLS DESABILITADA — risco crítico de vazamento entre tenants");
      critical++;
    } else if (isAdminOnly) {
      if (t.policies.length > 0) {
        status = "🟡";
        notes.push(`tem ${t.policies.length} policies mas deveria ser só service-role`);
        warning++;
      } else {
        notes.push("RLS habilitada sem policies (service-role only) — OK");
      }
    } else if (isReadOnly) {
      if (!cmds.has("SELECT") && !cmds.has("ALL")) {
        status = "🔴";
        notes.push("read-only mas sem SELECT policy");
        critical++;
      } else {
        notes.push(`SELECT OK (${t.policies.length} policies)`);
      }
    } else {
      const writeCmds = ["INSERT", "UPDATE", "DELETE"];
      const hasReads = cmds.has("SELECT") || cmds.has("ALL");
      const hasWrites = writeCmds.some((c) => cmds.has(c)) || cmds.has("ALL");
      if (!hasReads) {
        status = "🔴";
        notes.push("sem SELECT policy — user não vê próprios dados");
        critical++;
      }
      if (!hasWrites) {
        status = "🟡";
        notes.push("sem INSERT/UPDATE/DELETE — writes só via service-role");
        warning++;
      }
      if (hasReads && hasWrites) {
        notes.push(`${t.policies.length} policies (${Array.from(cmds).join(", ")})`);
      }
    }

    console.log(`${status} ${t.table_name}`);
    for (const note of notes) console.log(`    ${note}`);
  }

  console.log("\n=== Resumo ===");
  console.log(`  🔴 críticos: ${critical}`);
  console.log(`  🟡 alertas:  ${warning}`);
  console.log(`  🟢 ok:       ${tables.length - critical - warning}`);

  if (critical > 0) {
    console.error("\n⚠️  Há tabelas em estado crítico — resolva antes de beta.");
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Erro:", err);
  process.exit(1);
});
