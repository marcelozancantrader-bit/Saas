import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { env } from "@/lib/validators/env";

export type IntegrationStatus = {
  name: string;
  enabled: boolean;
  status: "ok" | "warn" | "error" | "disabled";
  detail: string;
};

export type AdminHealth = {
  integrations: IntegrationStatus[];
  databaseReachable: boolean;
  storageUsedBytes: number | null;
  storageObjectCount: number | null;
  aiCosts: {
    last30dUsd: number;
    last30dCount: number;
    allTimeUsd: number;
    allTimeCount: number;
  };
  recentErrors: number;
};

function envStatus(value: string | undefined, label: string): IntegrationStatus {
  if (!value || value.trim().length === 0) {
    return {
      name: label,
      enabled: false,
      status: "disabled",
      detail: "Env var não configurada",
    };
  }
  return { name: label, enabled: true, status: "ok", detail: "Configurado" };
}

export async function loadAdminHealth(): Promise<AdminHealth> {
  const supabase = createAdminClient();

  // Ping DB (consegue rodar query?)
  const dbStart = Date.now();
  const { error: dbErr } = await supabase
    .from("organizations")
    .select("id", { head: true, count: "exact" })
    .limit(1);
  const dbReachable = !dbErr;
  const dbMs = Date.now() - dbStart;

  const integrations: IntegrationStatus[] = [
    {
      name: "Supabase",
      enabled: true,
      status: dbReachable ? "ok" : "error",
      detail: dbReachable ? `Resposta em ${dbMs}ms` : `Erro: ${dbErr?.message ?? "desconhecido"}`,
    },
    envStatus(env.ANTHROPIC_API_KEY, "Anthropic (Claude IA)"),
    envStatus(env.INNGEST_EVENT_KEY, "Inngest"),
    envStatus(env.ASAAS_API_KEY, `Asaas (${env.ASAAS_ENVIRONMENT})`),
    envStatus(env.RESEND_API_KEY, "Resend (e-mail)"),
    envStatus(env.SENTRY_DSN, "Sentry (erros)"),
    envStatus(env.NEXT_PUBLIC_POSTHOG_KEY, "PostHog (analytics)"),
    {
      name: "Google OAuth",
      enabled: env.NEXT_PUBLIC_GOOGLE_OAUTH_ENABLED,
      status: env.NEXT_PUBLIC_GOOGLE_OAUTH_ENABLED ? "ok" : "disabled",
      detail: env.NEXT_PUBLIC_GOOGLE_OAUTH_ENABLED
        ? "Habilitado (lembre-se: app em modo Teste no Google)"
        : "Desabilitado",
    },
  ];

  // Custos IA: soma documents.custo_tokens (jsonb com cost_usd quando disponível)
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [allTimeRes, last30dRes] = await Promise.all([
    supabase.from("documents").select("custo_tokens, created_at"),
    supabase
      .from("documents")
      .select("custo_tokens, created_at")
      .gte("created_at", thirtyDaysAgo.toISOString()),
  ]);

  const allRows = (allTimeRes.data ?? []) as {
    custo_tokens: { cost_usd?: number } | null;
  }[];
  const last30dRows = (last30dRes.data ?? []) as {
    custo_tokens: { cost_usd?: number } | null;
  }[];

  const sumCost = (rows: typeof allRows) =>
    rows.reduce(
      (acc, r) =>
        acc + (typeof r.custo_tokens?.cost_usd === "number" ? r.custo_tokens.cost_usd : 0),
      0,
    );

  const aiCosts = {
    last30dUsd: sumCost(last30dRows),
    last30dCount: last30dRows.length,
    allTimeUsd: sumCost(allRows),
    allTimeCount: allRows.length,
  };

  // Storage usage via raw API (best-effort)
  let storageUsedBytes: number | null = null;
  let storageObjectCount: number | null = null;
  try {
    const { data: objects, error: storageErr } = await supabase
      .schema("storage")
      .from("objects")
      .select("metadata", { count: "exact" });
    if (!storageErr && objects) {
      const objs = objects as { metadata: { size?: number } | null }[];
      storageObjectCount = objs.length;
      storageUsedBytes = objs.reduce(
        (acc, o) => acc + (typeof o.metadata?.size === "number" ? o.metadata.size : 0),
        0,
      );
    }
  } catch {
    // ignora — storage schema talvez não esteja acessível via service role
  }

  // Recent errors: docs com extracao_status='erro' nas últimas 24h
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const { count: errCount } = await supabase
    .from("project_files")
    .select("id", { count: "exact", head: true })
    .eq("extracao_status", "erro")
    .gte("created_at", yesterday.toISOString());

  return {
    integrations,
    databaseReachable: dbReachable,
    storageUsedBytes,
    storageObjectCount,
    aiCosts,
    recentErrors: errCount ?? 0,
  };
}

export function formatBytes(bytes: number | null): string {
  if (bytes === null) return "—";
  if (bytes >= 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`;
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${bytes} B`;
}

export function formatUsd(usd: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(usd);
}
