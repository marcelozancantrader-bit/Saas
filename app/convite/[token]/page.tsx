import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Logo } from "@/components/brand/Logo";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { acceptInvitationAndRedirectAction } from "@/server/actions/invitations/accept-invitation.action";
import { Badge } from "@/components/ui/badge";
import { UserPlus, Mail, ShieldAlert } from "lucide-react";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ token: string }> };

export const metadata = {
  title: "Convite pra entrar — Memorial.ai",
  robots: { index: false, follow: false },
};

const ROLE_LABEL: Record<string, string> = {
  admin: "Admin (gerencia membros e configurações)",
  member: "Membro (acesso aos projetos)",
};

export default async function ConvitePage({ params }: Props) {
  const { token } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(token)) notFound();

  const admin = createAdminClient();
  const { data: invite } = await admin
    .from("invitations")
    .select("id, org_id, email, role, status, expires_at")
    .eq("token", token)
    .single<{
      id: string;
      org_id: string;
      email: string;
      role: "admin" | "member";
      status: string;
      expires_at: string;
    }>();

  if (!invite) notFound();

  const expired = new Date(invite.expires_at) < new Date();
  const cancelled = invite.status === "cancelled";
  const accepted = invite.status === "accepted";

  // Carrega nome da org pra mostrar
  const { data: org } = await admin
    .from("organizations")
    .select("name")
    .eq("id", invite.org_id)
    .single<{ name: string }>();
  const orgName = org?.name ?? "um escritório";

  // User logado?
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const loggedAs = user?.email ?? null;
  const emailMatch = loggedAs ? loggedAs.toLowerCase() === invite.email.toLowerCase() : false;

  // Se válido + logado com email certo, pode aceitar
  const canAccept = !expired && !cancelled && !accepted && emailMatch;

  // Bind do action pra usar no <form action={...}>
  async function acceptAction() {
    "use server";
    await acceptInvitationAndRedirectAction(token);
  }

  return (
    <main className="flex min-h-screen flex-col bg-zinc-50 dark:bg-zinc-950">
      <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3 sm:px-6">
          <Link href="/" aria-label="Memorial.ai" className="inline-flex items-center gap-2">
            <Logo size={24} />
            <span className="text-base font-semibold">Memorial.ai</span>
          </Link>
        </div>
      </header>

      <div className="mx-auto w-full max-w-md flex-1 px-4 py-12 sm:px-6">
        <Card>
          <CardContent className="space-y-5 p-6 text-center">
            <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-950/40">
              <UserPlus className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>

            <div>
              <h1 className="text-xl font-semibold tracking-tight">
                Convite pra entrar em{" "}
                <span className="text-blue-700 dark:text-blue-400">{orgName}</span>
              </h1>
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                Como <strong>{ROLE_LABEL[invite.role] ?? invite.role}</strong>
              </p>
            </div>

            <div className="rounded-md border border-zinc-200 bg-zinc-50 p-3 text-sm dark:border-zinc-800 dark:bg-zinc-900">
              <p className="text-xs text-zinc-500">Convite enviado para</p>
              <p className="mt-0.5 inline-flex items-center gap-1.5 font-medium">
                <Mail className="h-3.5 w-3.5 text-zinc-400" />
                {invite.email}
              </p>
            </div>

            {cancelled ? (
              <Badge variant="destructive">Convite cancelado</Badge>
            ) : accepted ? (
              <Badge>Convite já aceito</Badge>
            ) : expired ? (
              <Badge variant="destructive">Convite expirou</Badge>
            ) : null}

            {!loggedAs ? (
              <div className="space-y-3 text-sm">
                <p className="text-zinc-700 dark:text-zinc-300">
                  Pra aceitar, faça login (ou crie sua conta grátis) com o e-mail{" "}
                  <strong>{invite.email}</strong>.
                </p>
                <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
                  <Link
                    href={`/login?next=${encodeURIComponent(`/convite/${token}`)}`}
                    className={buttonVariants()}
                  >
                    Já tenho conta — Entrar
                  </Link>
                  <Link
                    href={`/signup?next=${encodeURIComponent(`/convite/${token}`)}`}
                    className={buttonVariants({ variant: "outline" })}
                  >
                    Criar conta grátis
                  </Link>
                </div>
              </div>
            ) : !emailMatch ? (
              <div className="space-y-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
                <ShieldAlert className="mx-auto h-5 w-5" />
                <p>
                  Você está logado como <strong>{loggedAs}</strong>, mas o convite foi enviado pra{" "}
                  <strong>{invite.email}</strong>.
                </p>
                <p className="text-xs">
                  Pra aceitar, saia e entre com o e-mail correto, ou peça um novo convite pra esse
                  e-mail.
                </p>
                <form
                  action={async () => {
                    "use server";
                    redirect("/login");
                  }}
                >
                  <Button type="submit" variant="outline" size="sm">
                    Trocar de conta
                  </Button>
                </form>
              </div>
            ) : canAccept ? (
              <form action={acceptAction}>
                <Button type="submit" size="lg" className="w-full">
                  Aceitar e entrar no workspace
                </Button>
              </form>
            ) : null}

            <p className="text-[11px] text-zinc-500">
              Convite expira em{" "}
              {new Date(invite.expires_at).toLocaleString("pt-BR", {
                day: "2-digit",
                month: "long",
                year: "numeric",
              })}
            </p>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
