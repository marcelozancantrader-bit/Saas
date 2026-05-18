import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { PlaceholderCard } from "@/components/features/shell/PlaceholderCard";
import { DeleteAccountDialog } from "@/components/features/configuracoes/DeleteAccountDialog";
import { getCurrentOrg } from "@/server/services/current-org";

export const dynamic = "force-dynamic";

export default async function ConfiguracoesPage() {
  const me = await getCurrentOrg();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Configurações</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Dados do escritório, branding, privacidade.
        </p>
      </div>

      <PlaceholderCard
        title="Workspace"
        description="Nome do escritório, CNPJ, registro CAU/CREA, logo, cor primária, BDI padrão, dados PIX. Convite de membros (limites por plano)."
        sprint="Sprint 1 (placeholder) → expandido em sprint dedicado de polish"
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Sua conta</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>
            <span className="text-zinc-500">E-mail: </span>
            <strong>{me.email}</strong>
          </p>
          <p>
            <span className="text-zinc-500">Papel: </span>
            <strong>{me.role}</strong> em <strong>{me.orgName}</strong>
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Privacidade e LGPD</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div>
            <p className="font-medium">Exportar meus dados</p>
            <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
              Baixa um arquivo JSON contendo todos os seus dados pessoais e os das organizações em
              que você é membro: clientes, projetos, documentos, orçamentos, audit log. Conforme
              art. 18, II da LGPD.
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
              Remove sua conta de autenticação E, para cada organização em que você é{" "}
              <strong>owner</strong>, exclui TODOS os dados da organização (clientes, projetos,
              documentos, orçamentos, audit log, assinaturas) em cascata. Esta ação não pode ser
              desfeita. Conforme art. 18, VI da LGPD.
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
