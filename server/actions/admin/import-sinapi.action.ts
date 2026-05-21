"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";
import * as XLSX from "xlsx";
import { assertPlatformAdminAndGetAdminClient } from "@/lib/auth/platform-admin";

const rowSchema = z.object({
  codigo: z.string().min(1).max(40),
  descricao: z.string().min(3).max(500),
  unidade: z.string().min(1).max(10),
  uf: z
    .string()
    .length(2)
    .transform((v) => v.toUpperCase()),
  mes_referencia: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato esperado YYYY-MM-DD"),
  desonerado: z.boolean(),
  preco: z.number().positive().finite(),
});

type ParsedRow = z.infer<typeof rowSchema>;

export type ImportSinapiResult =
  | {
      ok: true;
      mode: "preview" | "applied";
      total: number;
      sample: ParsedRow[];
      summary: {
        ufs: string[];
        meses: string[];
        codes: number;
      };
    }
  | { ok: false; error: string; rowErrors?: Array<{ row: number; message: string }> };

/**
 * Importa preços SINAPI via XLSX/CSV. Colunas esperadas (case-insensitive):
 *   - codigo (string)
 *   - descricao (string)
 *   - unidade (string, ex: "m", "un", "m²", "kg")
 *   - uf (2 chars, ex: "SP")
 *   - mes_referencia (YYYY-MM-DD)
 *   - desonerado (true/false ou 1/0 ou "sim"/"não")
 *   - preco (numérico, em R$, sem separador de milhar)
 *
 * Modo "preview" parseia e devolve sample (10 primeiras) + counts sem persistir.
 * Modo "apply" faz upsert real em sinapi_compositions.
 */
export async function importSinapiAction(formData: FormData): Promise<ImportSinapiResult> {
  const mode = formData.get("mode")?.toString() === "apply" ? "apply" : "preview";
  const file = formData.get("file");

  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Selecione um arquivo XLSX ou CSV." };
  }
  if (file.size > 25 * 1024 * 1024) {
    return { ok: false, error: "Arquivo muito grande (limite 25 MB)." };
  }

  let workbook: XLSX.WorkBook;
  try {
    const buf = Buffer.from(await file.arrayBuffer());
    workbook = XLSX.read(buf, { type: "buffer", cellDates: false });
  } catch {
    return { ok: false, error: "Não consegui ler o arquivo. Salve como .xlsx ou .csv padrão." };
  }

  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return { ok: false, error: "Arquivo sem planilhas." };
  const sheet = workbook.Sheets[sheetName]!;

  const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: null,
    raw: true,
  });

  if (raw.length === 0) {
    return { ok: false, error: "Planilha vazia (verifique se a primeira linha tem o cabeçalho)." };
  }

  const parsed: ParsedRow[] = [];
  const rowErrors: Array<{ row: number; message: string }> = [];

  for (let i = 0; i < raw.length; i++) {
    const row = normalizeKeys(raw[i]!);
    try {
      const candidate = {
        codigo: stringOrNumber(row.codigo),
        descricao: stringOrNumber(row.descricao),
        unidade: stringOrNumber(row.unidade),
        uf: stringOrNumber(row.uf),
        mes_referencia: normalizeMes(row.mes_referencia),
        desonerado: toBool(row.desonerado),
        preco: toNumber(row.preco),
      };
      const result = rowSchema.parse(candidate);
      parsed.push(result);
    } catch (err) {
      const msg = err instanceof z.ZodError ? (err.issues[0]?.message ?? "inválido") : "inválido";
      rowErrors.push({ row: i + 2, message: msg });
      if (rowErrors.length > 50) break;
    }
  }

  if (rowErrors.length > 0) {
    return {
      ok: false,
      error: `${rowErrors.length} linha(s) com erro. Corrija o arquivo e tente de novo.`,
      rowErrors: rowErrors.slice(0, 20),
    };
  }

  const ufs = Array.from(new Set(parsed.map((r) => r.uf))).sort();
  const meses = Array.from(new Set(parsed.map((r) => r.mes_referencia))).sort();
  const codes = new Set(parsed.map((r) => r.codigo)).size;

  if (mode === "preview") {
    return {
      ok: true,
      mode: "preview",
      total: parsed.length,
      sample: parsed.slice(0, 10),
      summary: { ufs, meses, codes },
    };
  }

  const { me, supabase } = await assertPlatformAdminAndGetAdminClient();

  const CHUNK = 500;
  for (let i = 0; i < parsed.length; i += CHUNK) {
    const slice = parsed.slice(i, i + CHUNK);
    const { error } = await supabase
      .from("sinapi_compositions")
      .upsert(slice, { onConflict: "codigo,uf,mes_referencia,desonerado" });
    if (error) {
      return { ok: false, error: `Falha no upsert (chunk ${i / CHUNK + 1}): ${error.message}` };
    }
  }

  const h = await headers();
  await supabase.from("audit_log").insert({
    actor_id: me.id,
    actor_type: "platform_admin",
    action: "sinapi.import",
    entity_type: "sinapi_compositions",
    payload: { total: parsed.length, ufs, meses, codes, admin_email: me.email },
    ip: h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    user_agent: h.get("user-agent") ?? null,
  });

  revalidatePath("/admin/sinapi");
  return {
    ok: true,
    mode: "applied",
    total: parsed.length,
    sample: parsed.slice(0, 10),
    summary: { ufs, meses, codes },
  };
}

function normalizeKeys(row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    const norm = key
      .toString()
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/\s+/g, "_");
    out[norm] = value;
  }
  return out;
}

function stringOrNumber(v: unknown): string {
  if (v === null || v === undefined) return "";
  return String(v).trim();
}

function toBool(v: unknown): boolean {
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v !== 0;
  const s = String(v ?? "")
    .trim()
    .toLowerCase();
  return s === "true" || s === "1" || s === "sim" || s === "s" || s === "desonerado" || s === "yes";
}

function toNumber(v: unknown): number {
  if (typeof v === "number") return v;
  const s = String(v ?? "")
    .trim()
    .replace(/\./g, "")
    .replace(",", ".");
  const n = Number(s);
  return Number.isFinite(n) ? n : NaN;
}

function normalizeMes(v: unknown): string {
  if (typeof v === "number") {
    const d = XLSX.SSF.parse_date_code(v);
    if (d) {
      const yyyy = d.y.toString().padStart(4, "0");
      const mm = d.m.toString().padStart(2, "0");
      const dd = d.d.toString().padStart(2, "0");
      return `${yyyy}-${mm}-${dd}`;
    }
  }
  const s = String(v ?? "").trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  if (/^\d{4}-\d{2}$/.test(s)) return `${s}-01`;
  const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  return s;
}
