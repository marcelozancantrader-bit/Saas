import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Soma `tamanho_bytes` de todos os `project_files` da org.
 *
 * Limitações conhecidas (subestima o uso real, o que é OK — usuário só atinge
 * o limite mais cedo que o esperado, nunca mais tarde):
 *   - Não inclui fotos do `project_diary_entries.photo_paths` (só paths
 *     armazenados, não bytes — precisaria iterar o bucket Storage).
 *   - Não inclui logos em `org-logos/` (bucket separado, raramente >10MB total).
 *
 * Pra contagem 100% precisa, futuramente: cron diário que varre o bucket
 * via Supabase Admin API e persiste em `organizations.meta.storage_used_bytes`.
 */
export async function getOrgStorageUsage(orgId: string): Promise<number> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("project_files")
    .select("tamanho_bytes, projects!inner(org_id)")
    .eq("projects.org_id", orgId);
  if (error || !data) return 0;
  return data.reduce((sum, row) => sum + ((row.tamanho_bytes as number | null) ?? 0), 0);
}

export type StorageQuotaCheck =
  | { ok: true }
  | { ok: false; usedBytes: number; limitBytes: number; bytesToAdd: number };

export async function checkStorageQuota(
  orgId: string,
  bytesToAdd: number,
  limitBytes: number | null,
): Promise<StorageQuotaCheck> {
  if (limitBytes === null) return { ok: true };
  const usedBytes = await getOrgStorageUsage(orgId);
  if (usedBytes + bytesToAdd > limitBytes) {
    return { ok: false, usedBytes, limitBytes, bytesToAdd };
  }
  return { ok: true };
}
