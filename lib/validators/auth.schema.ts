import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("E-mail inválido"),
  password: z.string().min(8, "Senha precisa ter ao menos 8 caracteres"),
  next: z.string().optional(),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const signupSchema = z.object({
  nome_completo: z.string().min(2, "Informe seu nome completo").max(120),
  email: z.string().email("E-mail inválido"),
  password: z
    .string()
    .min(8, "Senha precisa ter ao menos 8 caracteres")
    .max(72, "Senha excede o limite de 72 caracteres"),
  nome_escritorio: z.string().min(2, "Informe o nome do escritório").max(120),
  lgpd_consent: z
    .union([z.boolean(), z.literal("on"), z.literal("true"), z.literal("false")])
    .transform((v) => v === true || v === "on" || v === "true")
    .refine((v) => v, "É necessário aceitar a Política de Privacidade (LGPD)"),
});
export type SignupInput = z.infer<typeof signupSchema>;
