import "server-only";
import { env } from "@/lib/validators/env";

/**
 * Sprint 7 — wrapper Asaas (HTTP direto, sem SDK).
 *
 * Docs: https://docs.asaas.com/reference
 *
 * Gated em ASAAS_API_KEY. Se não configurado, `isAsaasEnabled()` retorna false
 * e o caller decide o fallback (no Sprint 7 v0 = upgrade manual, sem cobrança).
 */

const ASAAS_BASE = "https://api.asaas.com/v3";

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
  customer: string; // customer id
  billingType: "PIX" | "BOLETO" | "CREDIT_CARD";
  value: number; // in BRL (not cents)
  cycle: "MONTHLY" | "YEARLY";
  description: string;
  externalReference: string; // org_id
  nextDueDate: string; // YYYY-MM-DD
};

export type AsaasSubscriptionResponse = {
  id: string;
  status: string;
  nextDueDate: string;
  value: number;
};

async function call<T>(
  path: string,
  options: { method: "GET" | "POST" | "PUT" | "DELETE"; body?: unknown },
): Promise<{ ok: true; data: T } | { ok: false; error: string; status?: number }> {
  if (!env.ASAAS_API_KEY) return { ok: false, error: "ASAAS_API_KEY não configurada." };
  const res = await fetch(`${ASAAS_BASE}${path}`, {
    method: options.method,
    headers: {
      access_token: env.ASAAS_API_KEY,
      "Content-Type": "application/json",
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
    return { ok: true, customerId: search.data.data[0]!.id };
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
