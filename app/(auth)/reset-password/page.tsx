import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ResetPasswordForm } from "@/components/features/auth/ResetPasswordForm";

export const metadata = {
  title: "Nova senha · Memorial.ai",
};

export default function ResetPasswordPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Defina uma nova senha</CardTitle>
        <CardDescription>
          Você acessou via link de recuperação. Escolha uma senha forte e confirme abaixo.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <ResetPasswordForm />
        <p className="text-center text-sm text-zinc-600 dark:text-zinc-400">
          Link expirado?{" "}
          <Link
            href="/forgot-password"
            className="font-medium text-blue-600 underline-offset-2 hover:underline dark:text-blue-400"
          >
            Solicitar novo link
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
