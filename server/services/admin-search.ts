import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export type AdminSearchHit = {
  type: "org" | "user";
  id: string;
  label: string;
  sub: string | null;
  href: string;
};

/**
 * Busca cross-entity pro AdminTopBar: orgs (por nome/CNPJ) + users (por e-mail).
 * Limitado a 8 resultados de cada tipo pra latência baixa.
 */
export async function adminGlobalSearch(query: string): Promise<AdminSearchHit[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  const supabase = createAdminClient();

  const [orgsRes, usersRes] = await Promise.all([
    supabase
      .from("organizations")
      .select("id, name, cnpj, plano")
      .or(`name.ilike.%${q}%,cnpj.ilike.%${q}%`)
      .limit(8),
    supabase.auth.admin.listUsers({ page: 1, perPage: 50 }).then((res) => {
      const users = res?.data?.users ?? [];
      return users
        .filter((u) => u.email && u.email.toLowerCase().includes(q.toLowerCase()))
        .slice(0, 8);
    }),
  ]);

  const hits: AdminSearchHit[] = [];

  for (const o of (orgsRes.data ?? []) as {
    id: string;
    name: string;
    cnpj: string | null;
    plano: string;
  }[]) {
    hits.push({
      type: "org",
      id: o.id,
      label: o.name,
      sub: o.cnpj ? `${o.cnpj} · ${o.plano}` : `Plano ${o.plano}`,
      href: `/admin/organizations/${o.id}`,
    });
  }

  for (const u of usersRes) {
    hits.push({
      type: "user",
      id: u.id,
      label: u.email ?? "(sem e-mail)",
      sub: `Criado em ${new Date(u.created_at).toLocaleDateString("pt-BR")}`,
      href: `/admin/users/${u.id}`,
    });
  }

  return hits;
}
