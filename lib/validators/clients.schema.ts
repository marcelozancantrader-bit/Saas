import { z } from "zod";
import { isValidCpfOrCnpj } from "@/lib/validators/cpf-cnpj";

const UF_REGEX = /^[A-Z]{2}$/;

function trimOrUndefined(v: unknown): string | undefined {
  if (typeof v !== "string") return undefined;
  const trimmed = v.trim();
  return trimmed.length === 0 ? undefined : trimmed;
}

const cpfCnpjField = z
  .preprocess(trimOrUndefined, z.string().optional())
  .refine((v) => v === undefined || isValidCpfOrCnpj(v), {
    message: "CPF ou CNPJ inválido",
  });

const cepField = z.preprocess(
  (v) => (typeof v === "string" ? v.replace(/\D+/g, "") : v),
  z
    .string()
    .optional()
    .refine((v) => v === undefined || v.length === 0 || v.length === 8, {
      message: "CEP precisa ter 8 dígitos",
    }),
);

export const clientSchema = z.object({
  nome: z.string().trim().min(2, "Nome muito curto").max(120),
  cpf_cnpj: cpfCnpjField,
  email: z.preprocess(trimOrUndefined, z.string().email("E-mail inválido").optional()),
  telefone: z.preprocess(trimOrUndefined, z.string().optional()),
  endereco_cep: cepField,
  endereco_logradouro: z.preprocess(trimOrUndefined, z.string().optional()),
  endereco_numero: z.preprocess(trimOrUndefined, z.string().optional()),
  endereco_complemento: z.preprocess(trimOrUndefined, z.string().optional()),
  endereco_bairro: z.preprocess(trimOrUndefined, z.string().optional()),
  endereco_cidade: z.preprocess(trimOrUndefined, z.string().optional()),
  endereco_uf: z
    .preprocess((v) => (typeof v === "string" ? v.trim().toUpperCase() : v), z.string().optional())
    .refine((v) => v === undefined || v.length === 0 || UF_REGEX.test(v), {
      message: "UF inválida (use 2 letras maiúsculas)",
    }),
});

export type ClientInput = z.infer<typeof clientSchema>;
