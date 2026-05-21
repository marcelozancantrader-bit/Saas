import "server-only";
import { env } from "@/lib/validators/env";

/**
 * Wrapper Asaas (HTTP direto, sem SDK).
 *
 * Docs: https://docs.asaas.com/reference
 *
 * Gated em ASAAS_API_KEY. Se não configurado, `isAsaasEnabled()` retorna false
 * e o caller decide o fallback (upgrade manual, sem cobrança).
 *
 * Env vars:
 *   ASAAS_API_KEY        — chave gerada no painel Asaas (Integrações → API Keys)
 *   ASAAS_WEBHOOK_TOKEN  — string aleatória configurada também no painel Asaas
 *                          em Notificações → Webhook → "Token de autenticação"
 *   ASAAS_ENVIRONMENT    — "sandbox" (default) ou "production"
 */

function asaasBaseUrl(): string {
  return env.ASAAS_ENVIRONMENT === "production"
    ? "https://api.asaas.com/v3"
    : "https://api-sandbox.asaas.com/v3";
}

/** URL pública do invoice/fatura (usada no checkout_url retornado pro frontend). */
function asaasInvoiceBaseUrl(): string {
  return env.ASAAS_ENVIRONMENT === "production"
    ? "https://www.asaas.com"
    : "https://sandbox.asaas.com";
}

export function isAsaasEnabled(): boolean {
  return !!env.ASAAS_API_KEY;
}

type AsaasCustomerCreate = {
  name: string;
  email: string;
  cpfCnpj?: string;
  externalReference?: string; // we use org_id
};

type AsaasCustomerResponse = {
  id: string;
  name: string;
  email: string;
};

export type AsaasSubscriptionCreate = {
  customer: string;
  billingType: "PIX" | "BOLETO" | "CREDIT_CARD" | "UNDEFINED";
  value: number; // in BRL (not cents)
  cycle: "MONTHLY" | "YEARLY";
  description: string;
  externalReference: string;
  nextDueDate: string; // YYYY-MM-DD
};

export type AsaasSubscriptionResponse = {
  id: string;
  status: string;
  nextDueDate: string;
  value: number;
};

type AsaasPaymentResponse = {
  id: string;
  status: string;
  value: number;
  invoiceUrl: string;
  bankSlipUrl?: string;
};

async function call<T>(
  path: string,
  options: { method: "GET" | "POST" | "PUT" | "DELETE"; body?: unknown },
): Promise<{ ok: true; data: T } | { ok: false; error: string; status?: number }> {
  if (!env.ASAAS_API_KEY) return { ok: false, error: "ASAAS_API_KEY não configurada." };
  const res = await fetch(`${asaasBaseUrl()}${path}`, {
    method: options.method,
    headers: {
      access_token: env.ASAAS_API_KEY,
      "Content-Type": "application/json",
      "User-Agent": "memorial.ai/1.0",
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    return { ok: false, error: text.slice(0, 500), status: res.status };
  }
  const data = (await res.json()) as T;
  return { ok: true, data };
}

export async function createOrFindCustomer(
  input: AsaasCustomerCreate,
): Promise<{ ok: true; customerId: string } | { ok: false; error: string }> {
  // Busca por externalReference antes de criar (idempotência).
  const search = await call<{ data: AsaasCustomerResponse[] }>(
    `/customers?externalReference=${encodeURIComponent(input.externalReference ?? "")}`,
    { method: "GET" },
  );
  if (search.ok && search.data.data.length > 0) {
    const existingId = search.data.data[0]!.id;
    // Customer já existe — faz UPSERT pra garantir que cpfCnpj/nome/email
    // estejam atualizados (caso o usuário tenha adicionado o documento depois
    // da criação inicial). Asaas aceita POST em /customers/{id} pra atualizar.
    const upd = await call<AsaasCustomerResponse>(`/customers/${existingId}`, {
      method: "POST",
      body: input,
    });
    if (!upd.ok) {
      // Mesmo se update falhar, retorna o customer existente — o erro real
      // de cobrança vai aparecer no createSubscription se cpfCnpj for crítico.
      console.warn(`[asaas] failed to update customer ${existingId}: ${upd.error}`);
    }
    return { ok: true, customerId: existingId };
  }
  const created = await call<AsaasCustomerResponse>("/customers", {
    method: "POST",
    body: input,
  });
  if (!created.ok) return { ok: false, error: created.error };
  return { ok: true, customerId: created.data.id };
}

export async function createSubscription(
  input: AsaasSubscriptionCreate,
): Promise<{ ok: true; subscription: AsaasSubscriptionResponse } | { ok: false; error: string }> {
  const r = await call<AsaasSubscriptionResponse>("/subscriptions", {
    method: "POST",
    body: input,
  });
  if (!r.ok) return { ok: false, error: r.error };
  return { ok: true, subscription: r.data };
}

/**
 * Após criar uma subscription, busca o primeiro payment dela para obter o
 * `invoiceUrl` — link público que o cliente abre pra pagar via PIX/boleto/cartão.
 *
 * Tentativa best-effort: se falhar, caller pode usar a área genérica do cliente.
 */
export async function getFirstSubscriptionPayment(
  subscriptionId: string,
): Promise<{ ok: true; invoiceUrl: string; paymentId: string } | { ok: false; error: string }> {
  const r = await call<{ data: AsaasPaymentResponse[] }>(
    `/subscriptions/${encodeURIComponent(subscriptionId)}/payments?limit=1`,
    { method: "GET" },
  );
  if (!r.ok) return { ok: false, error: r.error };
  const first = r.data.data[0];
  if (!first) return { ok: false, error: "Nenhum payment encontrado na subscription." };
  return { ok: true, invoiceUrl: first.invoiceUrl, paymentId: first.id };
}

/** Link genérico da área do cliente — fallback se o invoice direto falhar. */
export function customerAreaUrl(customerId: string): string {
  return `${asaasInvoiceBaseUrl()}/c/${customerId}`;
}

/**
 * Cancela uma subscription no Asaas. Após esta chamada, nenhuma cobrança nova
 * é criada — mas o cliente continua tendo acesso até o fim do período já pago
 * (o caller deve marcar `cancel_at_period_end=true` no DB local pra refletir isso).
 *
 * Idempotente: se a sub já foi cancelada/removida no Asaas, retorna ok mesmo assim.
 */
export async function cancelSubscription(
  subscriptionId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const r = await call<{ deleted?: boolean; id?: string }>(
    `/subscriptions/${encodeURIComponent(subscriptionId)}`,
    { method: "DELETE" },
  );
  if (!r.ok) {
    if (r.status === 404) return { ok: true };
    return { ok: false, error: r.error };
  }
  return { ok: true };
}
