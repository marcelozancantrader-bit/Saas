import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoginForm } from "@/components/features/auth/LoginForm";

type LoginPageProps = {
  searchParams: Promise<{ confirm?: string; error?: string; next?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const justSignedUp = params.confirm === "1";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">
          {justSignedUp ? "Confirme seu e-mail" : "Entrar no Memorial.ai"}
        </CardTitle>
        <CardDescription>
          {justSignedUp
            ? "Quase lá — falta um clique no e-mail de confirmação."
            : "Acesse seu workspace de arquitetura ou engenharia."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {justSignedUp ? (
          <div className="space-y-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm dark:border-emerald-900 dark:bg-emerald-950/40">
            <p className="font-medium text-emerald-900 dark:text-emerald-100">
              ✓ Conta criada com sucesso!
            </p>
            <p className="text-emerald-800 dark:text-emerald-200">
              Enviamos um e-mail de confirmação para você. Abra a caixa de entrada (e a pasta de
              spam, por garantia) e clique no link para ativar seu workspace.
            </p>
            <p className="text-xs text-emerald-700 dark:text-emerald-300">
              Depois de confirmar, você pode entrar aqui usando e-mail e senha.
            </p>
          </div>
        ) : null}
        {params.error === "oauth_failed" ? (
          <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100">
            Não foi possível concluir o login social. Tente novamente.
          </div>
        ) : null}
        {params.error === "no_org" ? (
          <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100">
            Sua conta não tem um workspace associado. Entre em contato com{" "}
            <a href="mailto:suporte@memorial.ai" className="underline">
              suporte@memorial.ai
            </a>
            .
          </div>
        ) : null}
        <LoginForm nextUrl={params.next} />
        <p className="text-center text-sm text-zinc-600 dark:text-zinc-400">
          Ainda não tem conta?{" "}
          <Link
            href="/signup"
            className="font-medium text-blue-600 underline-offset-2 hover:underline dark:text-blue-400"
          >
            Criar workspace grátis
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
