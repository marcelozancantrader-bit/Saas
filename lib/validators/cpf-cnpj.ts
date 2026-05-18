/**
 * Algorithmic validation of Brazilian CPF and CNPJ.
 * No external API calls — uses only the official check digit algorithms.
 *
 * - CPF: 11 digits. Reject all-equal sequences (000.000.000-00, 111.111.111-11, etc.).
 * - CNPJ: 14 digits. Same all-equal rejection.
 *
 * References:
 *   Receita Federal — Regras de validação dos dígitos verificadores
 */

function onlyDigits(input: string): string {
  return input.replace(/\D+/g, "");
}

function allEqual(digits: string): boolean {
  return /^(\d)\1+$/.test(digits);
}

// ---------- CPF ----------
export function isValidCpf(input: string): boolean {
  const cpf = onlyDigits(input);
  if (cpf.length !== 11) return false;
  if (allEqual(cpf)) return false;

  const digits = cpf.split("").map(Number) as number[];

  const calc = (n: number): number => {
    let sum = 0;
    for (let i = 0; i < n; i += 1) sum += (digits[i] ?? 0) * (n + 1 - i);
    const rem = (sum * 10) % 11;
    return rem === 10 ? 0 : rem;
  };

  return calc(9) === digits[9] && calc(10) === digits[10];
}

// ---------- CNPJ ----------
export function isValidCnpj(input: string): boolean {
  const cnpj = onlyDigits(input);
  if (cnpj.length !== 14) return false;
  if (allEqual(cnpj)) return false;

  const digits = cnpj.split("").map(Number) as number[];

  const calc = (n: number): number => {
    const weights =
      n === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    let sum = 0;
    for (let i = 0; i < n; i += 1) sum += (digits[i] ?? 0) * (weights[i] ?? 0);
    const rem = sum % 11;
    return rem < 2 ? 0 : 11 - rem;
  };

  return calc(12) === digits[12] && calc(13) === digits[13];
}

// ---------- Combined helper for client form ----------
export function isValidCpfOrCnpj(input: string): boolean {
  const digits = onlyDigits(input);
  if (digits.length === 11) return isValidCpf(digits);
  if (digits.length === 14) return isValidCnpj(digits);
  return false;
}
