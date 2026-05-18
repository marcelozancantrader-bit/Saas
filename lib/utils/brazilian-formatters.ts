/**
 * Display formatters and input masks for Brazilian fields.
 * Keep these PURE — they don't validate, they only format/mask.
 */

function onlyDigits(input: string): string {
  return input.replace(/\D+/g, "");
}

// ---------- CPF ----------
export function maskCpf(input: string): string {
  const d = onlyDigits(input).slice(0, 11);
  return d
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1-$2");
}

// ---------- CNPJ ----------
export function maskCnpj(input: string): string {
  const d = onlyDigits(input).slice(0, 14);
  return d
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
}

export function maskCpfOrCnpj(input: string): string {
  const d = onlyDigits(input);
  return d.length <= 11 ? maskCpf(d) : maskCnpj(d);
}

// ---------- CEP ----------
export function maskCep(input: string): string {
  const d = onlyDigits(input).slice(0, 8);
  return d.replace(/^(\d{5})(\d)/, "$1-$2");
}

// ---------- Phone ----------
// (XX) XXXXX-XXXX (celular) | (XX) XXXX-XXXX (fixo)
export function maskPhone(input: string): string {
  const d = onlyDigits(input).slice(0, 11);
  if (d.length <= 10) {
    return d.replace(/^(\d{2})(\d)/, "($1) $2").replace(/(\d{4})(\d)/, "$1-$2");
  }
  return d.replace(/^(\d{2})(\d)/, "($1) $2").replace(/(\d{5})(\d)/, "$1-$2");
}

// ---------- BRL ----------
const BRL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});
export function formatBRL(value: number | string): string {
  const n = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(n)) return BRL.format(0);
  return BRL.format(n);
}
