"use server";

import { fetchAddressByCep, ViaCepError, type ViaCepAddress } from "@/lib/utils/viacep";

export type LookupCepResult =
  | { ok: true; address: ViaCepAddress }
  | { ok: false; reason: "not_found" | "invalid" | "network" };

export async function lookupCepAction(cep: string): Promise<LookupCepResult> {
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
