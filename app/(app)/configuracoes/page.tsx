import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { DeleteAccountDialog } from "@/components/features/configuracoes/DeleteAccountDialog";
import {
  WorkspaceForm,
  type WorkspaceInitial,
} from "@/components/features/configuracoes/WorkspaceForm";
import { AccountCard } from "@/components/features/configuracoes/AccountCard";
import { getCurrentOrg } from "@/server/services/current-org";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type OrgRow = {
  name: string;
  cnpj: string | null;
  registro_cau: string | null;
  registro_crea: string | null;
  logo_url: string | null;
  cor_primaria: string | null;
  cor_secundaria: string | null;
  bdi_padrao: number | null;
  dados_pix: { tipo?: string; chave?: string } | null;
  profissional_nome: string | null;
  profissional_cpf: string | null;
  profissional_endereco: string | null;
};

export default async function ConfiguracoesPage() {
  const me = await getCurrentOrg();
  const supabase = await createClient();

  const [{ data: org }, { data: userData }] = await Promise.all([
    supabase
      .from("organizations")
      .select(
        "name, cnpj, registro_cau, registro_crea, logo_url, cor_primaria, cor_secundaria, bdi_padrao, dados_pix, profissional_nome, profissional_cpf, profissional_endereco",
      )
      .eq("id", me.orgId)
      .single<OrgRow>(),
    supabase.auth.getUser(),
  ]);

  const user = userData?.user;
  const fullName =
    (user?.user_metadata?.full_name as string | undefined) ??
    (user?.user_metadata?.name as string | undefined) ??
    "";
  const providers = user?.app_metadata?.providers ?? [user?.app_metadata?.provider ?? "email"];

  const initial: WorkspaceInitial = {
    name: org?.name ?? "",
    cnpj: org?.cnpj ?? "",
    registro_cau: org?.registro_cau ?? "",
    registro_crea: org?.registro_crea ?? "",
    logo_url: org?.logo_url ?? "",
    cor_primaria: org?.cor_primaria ?? "",
    cor_secundaria: org?.cor_secundaria ?? "",
    bdi_padrao: org?.bdi_padrao ?? null,
    pix_tipo: (org?.dados_pix?.tipo as WorkspaceInitial["pix_tipo"]) ?? "",
    pix_chave: org?.dados_pix?.chave ?? "",
    profissional_nome: org?.profissional_nome ?? "",
    profissional_cpf: org?.profissional_cpf ?? "",
    profissional_endereco: org?.profissional_endereco ?? "",
  };

  const canEdit = me.role === "owner" || me.role === "admin";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Configurações</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Dados do escritório, branding, privacidade.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Workspace</CardTitle>
        </CardHeader>
        <CardContent>
          <WorkspaceForm initial={initial} canEdit={canEdit} />
        </CardContent>
      </Card>

      <AccountCard
        email={me.email}
        fullName={fullName}
        role={me.role}
        orgName={me.orgName}
        providers={providers as string[]}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Templates de documento</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p className="text-zinc-600 dark:text-zinc-400">
            Modelos de memorial, contrato, proposta etc salvos pelo escritório. Reusar em projetos
            futuros com substituição automática de{" "}
            <code className="text-xs">{"{{cliente.nome}}"}</code> e outras variáveis.
          </p>
          <Link
            href="/configuracoes/templates"
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            Ver biblioteca de templates →
          </Link>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Privacidade e LGPD</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div>
            <p className="font-medium">Baixar cópia dos meus dados</p>
            <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
              Arquivo JSON com tudo que está em sua conta: clientes, projetos, documentos,
              orçamentos e histórico. Você tem direito de portabilidade pela LGPD (art. 18).
            </p>
            <a
              href="/api/lgpd/export"
              className={buttonVariants({ variant: "outline", size: "sm", className: "mt-2" })}
            >
              Baixar export (JSON)
            </a>
          </div>

          <Separator />

          <div>
            <p className="font-medium text-red-600 dark:text-red-400">Excluir minha conta</p>
            <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
              Remove sua conta e o acesso a este workspace. Se você é o único owner da organização,{" "}
              <strong>todos os dados são apagados</strong> (clientes, projetos, documentos,
              orçamentos) — não há como recuperar. Pela LGPD, você pode pedir esse apagamento a
              qualquer momento.
            </p>
            <div className="mt-3">
              <DeleteAccountDialog />
            </div>
          </div>

          <Separator />

          <div className="text-xs text-zinc-500">
            <p>
              Veja também:{" "}
              <Link href="/privacidade" className="underline-offset-2 hover:underline">
                Política de Privacidade
              </Link>{" "}
              ·{" "}
              <Link href="/termos" className="underline-offset-2 hover:underline">
                Termos de uso
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
