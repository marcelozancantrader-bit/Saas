import { z } from "zod";

const envSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),

  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(20),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20).optional(),

  NEXT_PUBLIC_GOOGLE_OAUTH_ENABLED: z
    .enum(["true", "false"])
    .default("false")
    .transform((v) => v === "true"),

  ANTHROPIC_API_KEY: z.string().optional(),

  // Inngest — optional in dev (uses local dev server at :8288)
  INNGEST_EVENT_KEY: z.string().optional(),
  INNGEST_SIGNING_KEY: z.string().optional(),

  // Resend (transactional email) — Sprint 6 portal notifications. Optional:
  // when not set, emails são silenciosamente puladas (warn no servidor).
  RESEND_API_KEY: z.string().optional(),
  RESEND_FROM_EMAIL: z.string().email().optional(),

  // Asaas (cobrança PIX/boleto/cartão) — Sprint 7 billing. Optional: quando
  // não configurado, upgrade vira "manual" (atualiza plano direto sem cobrança).
  ASAAS_API_KEY: z.string().optional(),
  ASAAS_WEBHOOK_TOKEN: z.string().optional(),
});

type Env = z.infer<typeof envSchema>;

function parseEnv(): Env {
  // IMPORTANT: read each variable BY DIRECT PROPERTY ACCESS, not by passing
  // `process.env` as a whole object. Next.js / Turbopack only inlines
  // NEXT_PUBLIC_* values at build time when they are referenced directly
  // (e.g. `process.env.NEXT_PUBLIC_FOO`). Iterating or destructuring
  // `process.env` returns undefined for every key in the browser bundle.
  //
  // This file is imported by both server and client code. Server-only
  // variables (SUPABASE_SERVICE_ROLE_KEY, ANTHROPIC_API_KEY, INNGEST_*) are
  // intentionally marked optional in the schema — in the browser they parse
  // as undefined, and only code paths that actually use them (under
  // /server/* or in API routes) ever read them, where they will be the real
  // value at runtime.
  const parsed = envSchema.safeParse({
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    NEXT_PUBLIC_GOOGLE_OAUTH_ENABLED: process.env.NEXT_PUBLIC_GOOGLE_OAUTH_ENABLED,
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
    INNGEST_EVENT_KEY: process.env.INNGEST_EVENT_KEY,
    INNGEST_SIGNING_KEY: process.env.INNGEST_SIGNING_KEY,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    RESEND_FROM_EMAIL: process.env.RESEND_FROM_EMAIL,
    ASAAS_API_KEY: process.env.ASAAS_API_KEY,
    ASAAS_WEBHOOK_TOKEN: process.env.ASAAS_WEBHOOK_TOKEN,
  });
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(
      `Invalid environment variables:\n${issues}\n\nCheck .env.local against .env.example.`,
    );
  }
  return parsed.data;
}

export const env = parseEnv();
