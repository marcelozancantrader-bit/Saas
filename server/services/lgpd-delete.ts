import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Sprint 8 — LGPD: exclusão da conta + cascata (Lei 13.709/2018, art. 18, VI —
 * "eliminação dos dados pessoais").
 *
 * Regra:
 *   - Para cada org em que o usuário é OWNER: deleta a org inteira (cascata cobre
 *     clients/projects/documents/scope_changes/budgets/subscriptions/notifications/etc).
 *   - Para cada org em que é member/admin (não owner): só remove a linha de
 *     membership (a org continua existindo para os outros donos).
 *   - Depois deleta auth.users.
 *
 * Idempotente: roda mesmo se a deleção já tiver começado.
 *
 * Não toca em Storage de arquivos (project_files.storage_path). Para V0
 * aceitamos órfãos no bucket — limpeza manual depois.
 */

export type LgpdDeleteResult =
  | {
      ok: true;
      deleted_orgs: string[];
      removed_from_orgs: string[];
    }
  | { ok: false; error: string };

export async function deleteUserAccount(userId: string): Promise<LgpdDeleteResult> {
  const admin = createAdminClient();

  const { data: memberships, error: memErr } = await admin
    .from("organization_members")
    .select("org_id, role")
    .eq("user_id", userId);
  if (memErr) return { ok: false, error: memErr.message };

  const orgsToDelete: string[] = [];
  const orgsToLeave: string[] = [];

  for (const m of memberships ?? []) {
    if (m.role === "owner") orgsToDelete.push(m.org_id as string);
    else orgsToLeave.push(m.org_id as string);
  }

  // Best-effort: deleta orgs onde é owner (CASCADE em FK cobre tudo)
  for (const orgId of orgsToDelete) {
    const { error } = await admin.from("organizations").delete().eq("id", orgId);
    if (error) {
      return { ok: false, error: `Falha ao deletar org ${orgId}: ${error.message}` };
    }
  }

  // Remove memberships nas orgs que não são donas
  for (const orgId of orgsToLeave) {
    const { error } = await admin
      .from("organization_members")
      .delete()
      .eq("org_id", orgId)
      .eq("user_id", userId);
    if (error) {
      return {
        ok: false,
        error: `Falha ao remover membership de ${orgId}: ${error.message}`,
      };
    }
  }

  // Finalmente, deleta o usuário do Auth (não recuperável).
  const { error: authErr } = await admin.auth.admin.deleteUser(userId);
  if (authErr) return { ok: false, error: `Falha ao deletar auth user: ${authErr.message}` };

  return {
    ok: true,
    deleted_orgs: orgsToDelete,
    removed_from_orgs: orgsToLeave,
  };
}
