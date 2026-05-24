import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentOrg } from "@/server/services/current-org";
import { InviteMemberForm } from "@/components/features/membros/InviteMemberForm";
import { CancelInvitationButton } from "@/components/features/membros/CancelInvitationButton";
import { InviteLinkCopy } from "@/components/features/membros/InviteLinkCopy";
import { Crown, Shield, User } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Membros · Configurações · Memorial.ai",
};

type Membership = {
  user_id: string;
  role: "owner" | "admin" | "member";
  created_at: string;
};

type Invitation = {
  id: string;
  email: string;
  role: "admin" | "member";
  token: string;
  status: string;
  expires_at: string;
  created_at: string;
};

const ROLE_LABEL: Record<Membership["role"], string> = {
  owner: "Owner",
  admin: "Admin",
  member: "Membro",
};

const ROLE_ICON: Record<Membership["role"], typeof Crown> = {
  owner: Crown,
  admin: Shield,
  member: User,
};

const ROLE_TONE: Record<Membership["role"], string> = {
  owner:
    "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/40 dark:text-amber-200",
  admin:
    "border-blue-300 bg-blue-50 text-blue-900 dark:border-blue-900/40 dark:bg-blue-950/40 dark:text-blue-200",
  member:
    "border-zinc-300 bg-zinc-50 text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800/40 dark:text-zinc-300",
};

export default async function MembrosPage() {
  const me = await getCurrentOrg();
  const supabase = await createClient();
  const admin = createAdminClient();

  // Memberships da org
  const { data: memberships } = await supabase
    .from("organization_members")
    .select("user_id, role, created_at")
    .eq("org_id", me.orgId)
    .returns<Membership[]>();

  // Resolve e-mails dos members via admin client (auth.admin.getUserById)
  const membersWithEmail = await Promise.all(
    (memberships ?? []).map(async (m) => {
      const { data } = await admin.auth.admin.getUserById(m.user_id).catch(() => ({ data: null }));
      const email = data?.user?.email ?? "—";
      const fullName =
        (data?.user?.user_metadata?.full_name as string | undefined) ??
        (data?.user?.user_metadata?.name as string | undefined) ??
        null;
      return { ...m, email, fullName };
    }),
  );

  // Convites pendentes (RLS gated owner/admin)
  const { data: invites } = await supabase
    .from("invitations")
    .select("id, email, role, token, status, expires_at, created_at")
    .eq("org_id", me.orgId)
    .in("status", ["pending"])
    .order("created_at", { ascending: false })
    .returns<Invitation[]>();

  const canManage = me.role === "owner" || me.role === "admin";

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/configuracoes"
          className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-50"
        >
          ← Configurações
        </Link>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Membros</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Quem tem acesso ao workspace <strong>{me.orgName}</strong> e seus projetos.
        </p>
      </div>

      {canManage ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Convidar novo membro</CardTitle>
          </CardHeader>
          <CardContent>
            <InviteMemberForm />
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Membros ativos ({membersWithEmail.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {membersWithEmail.map((m) => {
              const Icon = ROLE_ICON[m.role];
              return (
                <li
                  key={m.user_id}
                  className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 shrink-0 text-zinc-400" />
                      <p className="truncate text-sm font-semibold">{m.fullName ?? m.email}</p>
                      <Badge variant="outline" className={ROLE_TONE[m.role]}>
                        {ROLE_LABEL[m.role]}
                      </Badge>
                    </div>
                    <p className="mt-0.5 text-xs text-zinc-500">
                      {m.fullName ? `${m.email} · ` : ""}
                      entrou em {new Date(m.created_at).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>

      {canManage && invites && invites.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Convites pendentes ({invites.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {invites.map((inv) => {
                const expired = new Date(inv.expires_at) < new Date();
                return (
                  <li
                    key={inv.id}
                    className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-medium">{inv.email}</p>
                        <Badge variant="outline" className={ROLE_TONE[inv.role]}>
                          {ROLE_LABEL[inv.role]}
                        </Badge>
                        {expired ? (
                          <Badge variant="destructive" className="text-[10px]">
                            Expirado
                          </Badge>
                        ) : null}
                      </div>
                      <p className="mt-0.5 text-xs text-zinc-500">
                        enviado em {new Date(inv.created_at).toLocaleDateString("pt-BR")} · expira
                        em {new Date(inv.expires_at).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <InviteLinkCopy token={inv.token} />
                      <CancelInvitationButton invitationId={inv.id} email={inv.email} />
                    </div>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
