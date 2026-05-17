import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SignupForm } from "@/components/features/auth/SignupForm";

export default function SignupPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Criar workspace</CardTitle>
        <CardDescription>
          Em 30 segundos você tem seu escritório no Memorial.ai. Sem cartão.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <SignupForm />
        <p className="text-center text-sm text-zinc-600 dark:text-zinc-400">
          Já tem conta?{" "}
          <Link href="/login" className="font-medium text-zinc-900 underline dark:text-zinc-50">
            Entrar
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
