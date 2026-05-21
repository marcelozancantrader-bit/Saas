"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { forgotPasswordAction } from "@/server/actions/auth/forgot-password.action";
import { Mail, CheckCircle2 } from "lucide-react";

export function ForgotPasswordForm() {
  const [pending, startTransition] = useTransition();
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setError(null);
    startTransition(async () => {
      const result = await forgotPasswordAction(formData);
      if (result.ok) {
        setSubmitted(true);
      } else {
        setError(result.error);
      }
    });
  }

  if (submitted) {
    return (
      <div className="space-y-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm dark:border-emerald-900 dark:bg-emerald-950/40">
        <div className="flex items-start gap-2">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <div>
            <p className="font-medium text-emerald-900 dark:text-emerald-100">
              E-mail enviado (se a conta existir)
            </p>
            <p className="mt-1 text-emerald-800 dark:text-emerald-200">
              Por segurança, sempre confirmamos o envio — mesmo se o e-mail não estiver cadastrado.
              Confira sua caixa de entrada e spam.
            </p>
            <p className="mt-2 text-xs text-emerald-700 dark:text-emerald-300">
              O link expira em 1 hora. Não chegou? Aguarde 1 minuto e tente de novo.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <div className="space-y-2">
        <Label htmlFor="email">E-mail da conta</Label>
        <div className="relative">
          <Mail className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            disabled={pending}
            placeholder="voce@escritorio.com"
            className="pl-9"
          />
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-200">
          {error}
        </div>
      )}

      <Button type="submit" className="w-full" disabled={pending} size="lg">
        {pending ? "Enviando…" : "Enviar link de recuperação"}
      </Button>

      <p className="text-center text-xs text-zinc-500">
        Vamos enviar um link seguro pro seu e-mail. Clica nele e você define uma nova senha.
      </p>
    </form>
  );
}
