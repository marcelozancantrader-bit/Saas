import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ForgotPasswordForm } from "@/components/features/auth/ForgotPasswordForm";

export const metadata = {
  title: "Recuperar senha · Memorial.ai",
};

export default function ForgotPasswordPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Recuperar senha</CardTitle>
        <CardDescription>
          Informe o e-mail da sua conta e te enviamos um link seguro pra criar uma nova senha.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <ForgotPasswordForm />
        <p className="text-center text-sm text-zinc-600 dark:text-zinc-400">
          Lembrou a senha?{" "}
          <Link
            href="/login"
            className="font-medium text-blue-600 underline-offset-2 hover:underline dark:text-blue-400"
          >
            Voltar pro login
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
