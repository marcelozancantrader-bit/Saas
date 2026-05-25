"use server";

import { fetchAddressByCep, ViaCepError, type ViaCepAddress } from "@/lib/utils/viacep";
import { checkRateLimit } from "@/lib/ratelimit/check";
import { getRequestIp } from "@/lib/ratelimit/ip";

export type LookupCepResult =
  | { ok: true; address: ViaCepAddress }
  | { ok: false; reason: "not_found" | "invalid" | "network" | "rate_limited" };

/**
 * Lookup ViaCEP. Rate limit por IP pra evitar usar Memorial.ai como proxy
 * de scanner de CEPs (vaza nosso IP no provider externo).
 */
export async function lookupCepAction(cep: string): Promise<LookupCepResult> {
  const ip = await getRequestIp();
  const rl = await checkRateLimit({
    key: `viacep:${ip}`,
    limit: 50,
    windowMs: 60 * 60 * 1000,
  });
  if (!rl.ok) return { ok: false, reason: "rate_limited" };

  try {
    const address = await fetchAddressByCep(cep);
    if (!address) return { ok: false, reason: "not_found" };
    return { ok: true, address };
  } catch (err) {
    if (err instanceof ViaCepError) {
      return { ok: false, reason: "invalid" };
    }
    return { ok: false, reason: "network" };
  }
}
