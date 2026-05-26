import "server-only";
import Big from "big.js";
import { ifConditionConfigSchema } from "../types";
import { type ActionContext, type ActionResult } from "./index";

/**
 * Avalia uma condição no payload. Retorna `branch: "true" | "false"` que o
 * engine usa pra escolher qual edge seguir (via sourceHandle).
 *
 * Operadores:
 *   - eq/ne: igualdade exata (case-sensitive)
 *   - gt/gte/lt/lte: comparação numérica (Big.js pra evitar float)
 *   - contains: substring (case-insensitive)
 */
export async function runIfCondition(
  config: Record<string, unknown>,
  ctx: ActionContext,
): Promise<ActionResult> {
  const parsed = ifConditionConfigSchema.safeParse(config);
  if (!parsed.success) {
    return { ok: false, error: `Config inválida: ${parsed.error.issues[0]?.message ?? "?"}` };
  }

  const actual = resolvePath(ctx.payload, parsed.data.path);
  const expected = parsed.data.value;

  let matched = false;
  try {
    matched = evaluate(actual, parsed.data.op, expected);
  } catch (err) {
    return {
      ok: false,
      error: `Falha ao avaliar condição: ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  return {
    ok: true,
    output: { actual, expected, op: parsed.data.op, matched },
    branch: matched ? "true" : "false",
  };
}

function resolvePath(obj: Record<string, unknown>, path: string): unknown {
  const cleaned = path.startsWith("payload.") ? path.slice(8) : path;
  const parts = cleaned.split(".");
  let cur: unknown = obj;
  for (const part of parts) {
    if (cur === null || cur === undefined || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[part];
  }
  return cur;
}

function evaluate(actual: unknown, op: string, expected: string): boolean {
  if (op === "eq") return String(actual) === expected;
  if (op === "ne") return String(actual) !== expected;
  if (op === "contains") {
    return String(actual ?? "")
      .toLowerCase()
      .includes(expected.toLowerCase());
  }
  // Numérico
  const a = new Big(String(actual ?? 0));
  const b = new Big(expected);
  if (op === "gt") return a.gt(b);
  if (op === "gte") return a.gte(b);
  if (op === "lt") return a.lt(b);
  if (op === "lte") return a.lte(b);
  return false;
}
