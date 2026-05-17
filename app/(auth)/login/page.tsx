import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoginForm } from "@/components/features/auth/LoginForm";

type LoginPageProps = {
  searchParams: Promise<{ confirm?: string; error?: string; next?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Entrar no Memorial.ai</CardTitle>
        <CardDescription>Acesse seu workspace de arquitetura ou engenharia.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {params.confirm === "1" ? (
          <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-100">
            Cadastro concluído. Confira sua caixa de entrada para confirmar o e-mail e fazer login.
          </div>
        ) : null}
        {params.error === "oauth_failed" ? (
          <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100">
            Não foi possível concluir o login social. Tente novamente.
          </div>
        ) : null}
        <LoginForm nextUrl={params.next} />
        <p className="text-center text-sm text-zinc-600 dark:text-zinc-400">
          Ainda não tem conta?{" "}
          <Link href="/signup" className="font-medium text-zinc-900 underline dark:text-zinc-50">
            Criar workspace
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
