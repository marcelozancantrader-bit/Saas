import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SignupForm } from "@/components/features/auth/SignupForm";

const BENEFICIOS = [
  "2 projetos completos no plano Free",
  "3 documentos por IA grátis todo mês",
  "Sem cartão de crédito necessário",
];

export default function SignupPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Criar seu workspace</CardTitle>
        <CardDescription>
          Em menos de 1 minuto seu escritório está rodando. Comece grátis, faça upgrade quando
          quiser.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <ul className="space-y-1.5 rounded-lg bg-blue-50 p-3 text-sm text-blue-900 dark:bg-blue-950/40 dark:text-blue-100">
          {BENEFICIOS.map((b) => (
            <li key={b} className="flex items-start gap-2">
              <span aria-hidden className="mt-0.5 font-semibold text-blue-600 dark:text-blue-400">
                ✓
              </span>
              <span>{b}</span>
            </li>
          ))}
        </ul>

        <SignupForm />

        <p className="text-center text-sm text-zinc-600 dark:text-zinc-400">
          Já tem conta?{" "}
          <Link
            href="/login"
            className="font-medium text-blue-600 underline-offset-2 hover:underline dark:text-blue-400"
          >
            Entrar
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
