"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { loginAction } from "@/server/actions/auth/login.action";
import { resendConfirmationAction } from "@/server/actions/auth/resend-confirmation.action";
import { GoogleOAuthButton } from "./GoogleOAuthButton";
import { toast } from "sonner";

type Props = { nextUrl?: string };

export function LoginForm({ nextUrl }: Props) {
  const [pending, startTransition] = useTransition();
  const [resending, startResending] = useTransition();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [needsConfirmation, setNeedsConfirmation] = useState<string | null>(null);
  const googleEnabled = process.env.NEXT_PUBLIC_GOOGLE_OAUTH_ENABLED === "true";

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setFieldErrors({});
    setNeedsConfirmation(null);
    startTransition(async () => {
      const result = await loginAction(formData);
      if (!result) return;
      if ("fieldErrors" in result) {
        setFieldErrors(result.fieldErrors);
      } else if ("needs_confirmation" in result) {
        setNeedsConfirmation(result.email);
      } else {
        toast.error(result.error);
      }
    });
  }

  function handleResend() {
    if (!needsConfirmation) return;
    startResending(async () => {
      await resendConfirmationAction({ email: needsConfirmation });
      toast.success("E-mail de confirmação reenviado. Verifique caixa de entrada e spam.");
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      {nextUrl ? <input type="hidden" name="next" value={nextUrl} /> : null}

      {needsConfirmation ? (
        <div className="space-y-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm dark:border-amber-900 dark:bg-amber-950/40">
          <p className="font-medium text-amber-900 dark:text-amber-100">
            Falta confirmar seu e-mail
          </p>
          <p className="text-amber-800 dark:text-amber-200">
            Enviamos um link de confirmação pra <b>{needsConfirmation}</b>. Abra o e-mail (ou a
            pasta de spam) e clique no botão pra ativar o workspace.
          </p>
          <p className="text-xs text-amber-700 dark:text-amber-300">
            Não recebeu? O link pode levar até 5 minutos pra chegar. Use o botão abaixo se precisar
            de outro.
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleResend}
            disabled={resending}
          >
            {resending ? "Reenviando…" : "Reenviar e-mail de confirmação"}
          </Button>
        </div>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="email">E-mail</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          disabled={pending}
          placeholder="voce@escritorio.com"
        />
        {fieldErrors.email?.[0] ? (
          <p className="text-sm text-red-600">{fieldErrors.email[0]}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="password">Senha</Label>
          <Link
            href="/forgot-password"
            className="text-xs font-medium text-blue-600 hover:underline dark:text-blue-400"
          >
            Esqueci a senha
          </Link>
        </div>
        <div className="relative">
          <Input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            required
            minLength={8}
            disabled={pending}
            className="pr-20"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute top-1/2 right-2 -translate-y-1/2 rounded px-2 py-0.5 text-xs font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
            aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
          >
            {showPassword ? "Ocultar" : "Mostrar"}
          </button>
        </div>
        {fieldErrors.password?.[0] ? (
          <p className="text-sm text-red-600">{fieldErrors.password[0]}</p>
        ) : null}
      </div>

      <Button type="submit" className="w-full" disabled={pending} size="lg">
        {pending ? "Entrando…" : "Entrar"}
      </Button>

      <div className="relative py-2">
        <Separator />
        <span className="bg-card absolute inset-x-0 -top-0.5 mx-auto w-fit px-2 text-xs text-zinc-500">
          ou
        </span>
      </div>

      <GoogleOAuthButton enabled={googleEnabled} />
    </form>
  );
}
