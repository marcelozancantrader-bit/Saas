import Big from "big.js";

/**
 * Wrappers around big.js for safe monetary math.
 *
 * Per CLAUDE.md rule: NUNCA usar `number` para valores monetários.
 * - Toda soma/multiplicação/percentual vai por Big.
 * - Strings entrando/saindo do banco (`numeric` column) também viram Big.
 * - Para exibir: formatBRL() converte para a string com `R$ 1.234,56`.
 */

// 2 casas decimais, arredondamento half-up (padrão financeiro)
Big.DP = 4; // mais precisão internamente
Big.RM = Big.roundHalfUp;

export type Money = Big;

export function money(value: Big.BigSource): Money {
  return new Big(value);
}

export function moneyZero(): Money {
  return new Big(0);
}

export function sumMoney(values: Big.BigSource[]): Money {
  return values.reduce<Big>((acc, v) => acc.plus(v), new Big(0));
}

export function mulQty(unitPrice: Big.BigSource, qty: Big.BigSource): Money {
  return new Big(unitPrice).times(qty);
}

/**
 * Apply BDI (percentual ex.: 25 → multiplica por 1.25)
 */
export function applyBdi(base: Big.BigSource, bdiPct: Big.BigSource): Money {
  const factor = new Big(1).plus(new Big(bdiPct).div(100));
  return new Big(base).times(factor);
}

/**
 * Converte um valor (Big | string | number) para o string `numeric(15,2)`
 * que o Postgres aceita. Arredonda para 2 casas.
 */
export function toDbNumeric(value: Big.BigSource): string {
  return new Big(value).round(2, Big.roundHalfUp).toFixed(2);
}

/**
 * Format BRL — "R$ 1.234,56".
 * Aceita string vindo do banco, number, ou Big.
 */
const BRL_FORMATTER = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export function formatBRL(value: Big.BigSource | null | undefined): string {
  if (value === null || value === undefined || value === "") return "—";
  try {
    const n =
      typeof value === "object" && value && "toNumber" in value ? value.toNumber() : Number(value);
    if (!Number.isFinite(n)) return "—";
    return BRL_FORMATTER.format(n);
  } catch {
    return "—";
  }
}

/**
 * Parse string do tipo "1.234,56" (input do usuário em PT-BR) para Big.
 * Aceita também "1234.56" (formato US/raw).
 */
export function parseBRL(input: string): Money | null {
  if (!input) return null;
  const trimmed = input.trim();
  // Remove "R$", espaços
  const cleaned = trimmed.replace(/R\$\s*/g, "").trim();
  // Decide formato: se tem vírgula como último separador, é PT-BR
  const hasComma = cleaned.includes(",");
  const hasDot = cleaned.includes(".");
  let normalized: string;
  if (hasComma && hasDot) {
    // "1.234,56" — pontos são milhares, vírgula é decimal
    normalized = cleaned.replace(/\./g, "").replace(",", ".");
  } else if (hasComma) {
    // "1234,56" — vírgula decimal
    normalized = cleaned.replace(",", ".");
  } else {
    // "1234" ou "1234.56" — já em formato JS
    normalized = cleaned;
  }
  try {
    return new Big(normalized);
  } catch {
    return null;
  }
}
