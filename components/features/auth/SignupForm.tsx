"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { signupAction } from "@/server/actions/auth/signup.action";
import { GoogleOAuthButton } from "./GoogleOAuthButton";
import { PasswordStrength } from "./PasswordStrength";
import { toast } from "sonner";

export function SignupForm() {
  const [pending, startTransition] = useTransition();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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
          placeholder="João da Silva"
        />
        {fieldErrors.nome_completo?.[0] ? (
          <p className="text-sm text-red-600">{fieldErrors.nome_completo[0]}</p>
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
          placeholder="Ex: Studio Silva Arquitetura"
        />
        {fieldErrors.nome_escritorio?.[0] ? (
          <p className="text-sm text-red-600">{fieldErrors.nome_escritorio[0]}</p>
        ) : null}
        <p className="text-xs text-zinc-500">
          Aparece no portal do cliente e no rodapé dos PDFs gerados.
        </p>
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
          placeholder="voce@escritorio.com"
        />
        {fieldErrors.email?.[0] ? (
          <p className="text-sm text-red-600">{fieldErrors.email[0]}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Senha</Label>
        <div className="relative">
          <Input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            required
            minLength={8}
            disabled={pending}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
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
        <PasswordStrength password={password} />
        {fieldErrors.password?.[0] ? (
          <p className="text-sm text-red-600">{fieldErrors.password[0]}</p>
        ) : password.length === 0 ? (
          <p className="text-xs text-zinc-500">
            Mínimo 8 caracteres. Mistura de maiúsculas, números e símbolos deixa mais forte.
          </p>
        ) : null}
      </div>

      <label className="flex cursor-pointer items-start gap-2 text-sm text-zinc-700 dark:text-zinc-300">
        <input
          type="checkbox"
          name="lgpd_consent"
          required
          disabled={pending}
          className="mt-0.5 h-4 w-4 cursor-pointer"
        />
        <span>
          Li e aceito a{" "}
          <Link
            href="/privacidade"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 underline-offset-2 hover:underline dark:text-blue-400"
          >
            Política de Privacidade
          </Link>{" "}
          e os{" "}
          <Link
            href="/termos"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 underline-offset-2 hover:underline dark:text-blue-400"
          >
            Termos de Uso
          </Link>{" "}
          (LGPD).
        </span>
      </label>
      {fieldErrors.lgpd_consent?.[0] ? (
        <p className="text-sm text-red-600">{fieldErrors.lgpd_consent[0]}</p>
      ) : null}

      <Button type="submit" className="w-full" disabled={pending} size="lg">
        {pending ? "Criando workspace…" : "Criar workspace gratuito"}
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
