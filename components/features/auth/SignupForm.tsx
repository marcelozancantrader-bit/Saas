"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { signupAction } from "@/server/actions/auth/signup.action";
import { GoogleOAuthButton } from "./GoogleOAuthButton";
import { toast } from "sonner";

export function SignupForm() {
  const [pending, startTransition] = useTransition();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const googleEnabled = process.env.NEXT_PUBLIC_GOOGLE_OAUTH_ENABLED === "true";

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setFieldErrors({});
    startTransition(async () => {
      const result = await signupAction(formData);
      if (!result) return;
      if ("fieldErrors" in result) {
        setFieldErrors(result.fieldErrors);
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <div className="space-y-2">
        <Label htmlFor="nome_completo">Seu nome completo</Label>
        <Input
          id="nome_completo"
          name="nome_completo"
          type="text"
          autoComplete="name"
          required
          disabled={pending}
        />
        {fieldErrors.nome_completo?.[0] ? (
          <p className="text-xs text-red-600">{fieldErrors.nome_completo[0]}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="nome_escritorio">Nome do escritório</Label>
        <Input
          id="nome_escritorio"
          name="nome_escritorio"
          type="text"
          required
          disabled={pending}
          placeholder="Ex: Studio Camila Arquitetura"
        />
        {fieldErrors.nome_escritorio?.[0] ? (
          <p className="text-xs text-red-600">{fieldErrors.nome_escritorio[0]}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">E-mail profissional</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          disabled={pending}
        />
        {fieldErrors.email?.[0] ? (
          <p className="text-xs text-red-600">{fieldErrors.email[0]}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Senha</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          disabled={pending}
        />
        {fieldErrors.password?.[0] ? (
          <p className="text-xs text-red-600">{fieldErrors.password[0]}</p>
        ) : null}
      </div>

      <label className="flex cursor-pointer items-start gap-2 text-xs text-zinc-600 dark:text-zinc-400">
        <input type="checkbox" name="lgpd_consent" required disabled={pending} className="mt-0.5" />
        <span>
          Li e aceito a{" "}
          <Link href="/privacidade" className="underline">
            Política de Privacidade
          </Link>{" "}
          e os Termos de Uso (LGPD).
        </span>
      </label>
      {fieldErrors.lgpd_consent?.[0] ? (
        <p className="text-xs text-red-600">{fieldErrors.lgpd_consent[0]}</p>
      ) : null}

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Criando workspace…" : "Criar workspace gratuito"}
      </Button>

      <div className="relative">
        <Separator />
        <span className="absolute inset-x-0 -top-2 mx-auto w-fit bg-zinc-50 px-2 text-xs text-zinc-500 dark:bg-zinc-950">
          ou
        </span>
      </div>

      <GoogleOAuthButton enabled={googleEnabled} />
    </form>
  );
}
