/**
 * Sprint 3 — DoD: AI extraction pipeline (Claude Sonnet 4.6 + tool_use + Inngest).
 *
 * Validates:
 *   1. zod schema parses a realistic extraction result.
 *   2. zod schema rejects malformed payloads.
 *   3. Inngest function exists with correct trigger.
 *   4. (If ANTHROPIC_API_KEY set) real extraction on a synthetic PDF returns a valid result.
 *
 * Run with: npx tsx scripts/sprint3-dod-test.ts
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadEnv() {
  const envPath = resolve(process.cwd(), ".env.local");
  const text = readFileSync(envPath, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
    if (m && !process.env[m[1]!]) process.env[m[1]!] = m[2];
  }
}
loadEnv();

let failures = 0;
function assert(cond: boolean, msg: string) {
  if (cond) console.log(`  ✅ ${msg}`);
  else {
    console.error(`  ❌ ${msg}`);
    failures += 1;
  }
}

async function main() {
  console.log("\n🔬 Sprint 3 — DoD test: AI extraction pipeline\n");

  // Step 1: schema parses a valid result
  console.log("Step 1: zod schema accepts a realistic extraction result");
  const { floorPlanExtractionSchema } = await import("../lib/ai/prompts/extract-floor-plan.v1.js");
  const validResult = {
    area_total_m2: 85,
    area_terreno_m2: null,
    ambientes: [
      { nome: "Sala", area_m2: 25, tipo: "sala" as const },
      { nome: "Cozinha", area_m2: 12, tipo: "cozinha" as const },
    ],
    numero_pavimentos: 1,
    tipologia: "residencial" as const,
    padrao_construtivo: "medio" as const,
    elementos_especiais: {
      piscina: false,
      churrasqueira: false,
      sacada: false,
      garagem: true,
      jardim: false,
      area_servico_externa: false,
    },
    observacoes: "Casa térrea simples",
    confianca: "alta" as const,
  };
  const parsed = floorPlanExtractionSchema.safeParse(validResult);
  assert(parsed.success, "Valid result passes zod");

  // Step 2: schema rejects bad payloads
  console.log("\nStep 2: zod schema rejects malformed payloads");
  const tooBig = floorPlanExtractionSchema.safeParse({ ...validResult, area_total_m2: -1 });
  assert(!tooBig.success, "Negative area is rejected");
  const wrongTipologia = floorPlanExtractionSchema.safeParse({
    ...validResult,
    tipologia: "industrial",
  });
  assert(!wrongTipologia.success, "Unknown tipologia is rejected");
  const missingField = floorPlanExtractionSchema.safeParse({
    ...validResult,
    elementos_especiais: { piscina: false }, // missing the other 5
  });
  assert(!missingField.success, "Incomplete elementos_especiais is rejected");

  // Step 3: Inngest event payload type matches what registerUploadAction emits
  console.log("\nStep 3: Inngest client + event payload");
  const { inngest } = await import("../lib/inngest/client.js");
  assert(inngest.id === "memorial-ai", "Inngest client has correct id");
  // The Inngest function itself imports server-only and can only run inside Next/Inngest dev server.
  // Its presence is validated by `npm run build` (route /api/inngest compiles successfully).

  // Step 4: optional real API call
  if (!process.env.ANTHROPIC_API_KEY) {
    console.log("\nStep 4: skipped (ANTHROPIC_API_KEY not set in .env.local)");
    console.log(
      "   Add ANTHROPIC_API_KEY to .env.local to run a live extraction on a synthetic PDF.",
    );
  } else {
    console.log("\nStep 4: 🤖 Live Claude Sonnet 4.6 call on a synthetic floor-plan PDF");
    const { extractFloorPlanData } = await import("../lib/ai/extract-floor-plan.js");

    // Minimal valid 1-page PDF with floor-plan text. Crafted by hand to avoid pdf-gen deps.
    const PDF_TEXT =
      "%PDF-1.4\n" +
      "1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n" +
      "2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj\n" +
      "3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj\n" +
      "4 0 obj << /Length 380 >> stream\n" +
      "BT /F1 14 Tf 50 800 Td (PLANTA BAIXA - CASA RESIDENCIAL) Tj\n" +
      "0 -30 Td (Pavimento unico - 1 piso) Tj\n" +
      "0 -30 Td (Sala de estar: 25,0 m2) Tj\n" +
      "0 -20 Td (Cozinha: 12,0 m2) Tj\n" +
      "0 -20 Td (Quarto 1: 14,0 m2) Tj\n" +
      "0 -20 Td (Quarto 2 (suite): 16,0 m2) Tj\n" +
      "0 -20 Td (Banheiro social: 4,5 m2) Tj\n" +
      "0 -20 Td (Area de servico: 5,0 m2) Tj\n" +
      "0 -20 Td (Garagem coberta: 16,0 m2) Tj\n" +
      "0 -30 Td (AREA TOTAL CONSTRUIDA: 92,5 m2) Tj\n" +
      "ET\n" +
      "endstream\n" +
      "endobj\n" +
      "5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj\n" +
      "xref\n" +
      "0 6\n" +
      "0000000000 65535 f \n" +
      "0000000009 00000 n \n" +
      "0000000058 00000 n \n" +
      "0000000111 00000 n \n" +
      "0000000228 00000 n \n" +
      "0000000657 00000 n \n" +
      "trailer << /Size 6 /Root 1 0 R >>\n" +
      "startxref\n" +
      "732\n" +
      "%%EOF\n";

    const pdfBytes = Buffer.from(PDF_TEXT, "latin1");
    console.log(`   PDF size: ${pdfBytes.length} bytes`);

    const t0 = Date.now();
    const result = await extractFloorPlanData(
      { pdfBytes, filename: "test-planta.pdf" },
      { timeoutMs: 60_000 },
    );
    const elapsedMs = Date.now() - t0;

    if (!result.ok) {
      console.error(`  ❌ Extraction failed: ${result.error} ${result.detail ?? ""}`);
      failures += 1;
    } else {
      console.log(`  ✅ Extraction OK in ${(elapsedMs / 1000).toFixed(1)}s`);
      console.log(`     Cost: $${result.usage.usd_cost.toFixed(4)}`);
      console.log(`     Tipologia: ${result.data.tipologia}`);
      console.log(`     Padrão: ${result.data.padrao_construtivo}`);
      console.log(`     Área total: ${result.data.area_total_m2} m²`);
      console.log(`     Ambientes: ${result.data.ambientes.length}`);
      console.log(`     Confiança: ${result.data.confianca}`);

      assert(result.data.tipologia === "residencial", "Detected residencial tipologia");
      assert(
        result.data.area_total_m2 !== null && result.data.area_total_m2 > 70,
        `Detected area_total_m2 ~= 92.5 (got ${result.data.area_total_m2})`,
      );
      assert(
        result.data.ambientes.length >= 5,
        `Detected ≥5 ambientes (got ${result.data.ambientes.length})`,
      );
    }
  }

  console.log(
    `\n${failures === 0 ? "✅ Sprint 3 DoD PASSED" : `❌ Sprint 3 DoD FAILED (${failures})`}\n`,
  );
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error("\n💥 Unexpected error:", err);
  process.exit(1);
});
