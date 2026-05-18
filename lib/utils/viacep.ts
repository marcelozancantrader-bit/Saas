/**
 * ViaCEP integration — fetch Brazilian postal code data.
 * https://viacep.com.br/ — public, no API key, generous rate limit.
 *
 * Validates the response with zod. Returns null when the CEP is not found.
 */

import { z } from "zod";

const viacepResponseSchema = z.union([
  z.object({
    cep: z.string(),
    logradouro: z.string(),
    complemento: z.string(),
    bairro: z.string(),
    localidade: z.string(),
    uf: z.string(),
  }),
  z.object({ erro: z.literal(true) }),
  z.object({ erro: z.literal("true") }),
]);

export type ViaCepAddress = {
  cep: string;
  logradouro: string;
  complemento: string;
  bairro: string;
  cidade: string;
  uf: string;
};

export class ViaCepError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ViaCepError";
  }
}

function onlyDigits(s: string): string {
  return s.replace(/\D+/g, "");
}

export async function fetchAddressByCep(rawCep: string): Promise<ViaCepAddress | null> {
  const cep = onlyDigits(rawCep);
  if (cep.length !== 8) {
    throw new ViaCepError("CEP precisa ter 8 dígitos");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    if (!res.ok) {
      throw new ViaCepError(`ViaCEP retornou ${res.status}`);
    }
    const json: unknown = await res.json();
    const parsed = viacepResponseSchema.safeParse(json);
    if (!parsed.success) {
      throw new ViaCepError("Resposta inesperada do ViaCEP");
    }
    if ("erro" in parsed.data) return null;
    return {
      cep: parsed.data.cep,
      logradouro: parsed.data.logradouro,
      complemento: parsed.data.complemento,
      bairro: parsed.data.bairro,
      cidade: parsed.data.localidade,
      uf: parsed.data.uf,
    };
  } finally {
    clearTimeout(timeout);
  }
}
