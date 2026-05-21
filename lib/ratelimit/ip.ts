import "server-only";
import { headers } from "next/headers";

/**
 * Extrai o IP do request via headers (Vercel/Cloudflare). Fallback "unknown"
 * pra dev local — em prod o Vercel sempre seta x-forwarded-for.
 */
export async function getRequestIp(): Promise<string> {
  const h = await headers();
  const xff = h.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  return h.get("x-real-ip") ?? "unknown";
}
