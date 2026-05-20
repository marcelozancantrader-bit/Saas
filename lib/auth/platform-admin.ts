import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type PlatformAdminUser = {
  id: string;
  email: string;
  grantedAt: string;
};

/**
 * Verifica se o usuário atual é platform admin.
 * Server-only. Retorna o user se for, ou redireciona se não.
 *
 * Use em layouts/pages dentro de /admin para defense-in-depth.
 */
export async function requirePlatformAdmin(): Promise<PlatformAdminUser> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/admin");
  }

  const { data: adminRow } = await supabase
    .from("platform_admins")
    .select("user_id, granted_at")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!adminRow) {
    redirect("/dashboard?error=admin_only");
  }

  return {
    id: user.id,
    email: user.email ?? "",
    grantedAt: adminRow.granted_at,
  };
}

/**
 * Check non-bloqueante. Retorna boolean.
 * Útil para condicionalmente mostrar links/badges em UI compartilhada.
 */
export async function isPlatformAdmin(userId?: string): Promise<boolean> {
  const supabase = await createClient();

  let id = userId;
  if (!id) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    id = user?.id;
  }
  if (!id) return false;

  const { data } = await supabase
    .from("platform_admins")
    .select("user_id")
    .eq("user_id", id)
    .maybeSingle();

  return !!data;
}

/**
 * Service-role check para uso em server actions que precisam bypassar RLS
 * (ex.: listar todas as orgs do SaaS). Sempre usar APÓS requirePlatformAdmin.
 */
export async function assertPlatformAdminAndGetAdminClient() {
  const me = await requirePlatformAdmin();
  return { me, supabase: createAdminClient() };
}
