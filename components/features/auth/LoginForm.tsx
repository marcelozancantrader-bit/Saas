"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { loginAction } from "@/server/actions/auth/login.action";
import { GoogleOAuthButton } from "./GoogleOAuthButton";
import { toast } from "sonner";

type Props = { nextUrl?: string };

export function LoginForm({ nextUrl }: Props) {
  const [pending, startTransition] = useTransition();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const googleEnabled = process.env.NEXT_PUBLIC_GOOGLE_OAUTH_ENABLED === "true";

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setFieldErrors({});
    startTransition(async () => {
      const result = await loginAction(formData);
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
      {nextUrl ? <input type="hidden" name="next" value={nextUrl} /> : null}

      <div className="space-y-2">
        <Label htmlFor="email">E-mail</Label>
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
          autoComplete="current-password"
          required
          minLength={8}
          disabled={pending}
        />
        {fieldErrors.password?.[0] ? (
          <p className="text-xs text-red-600">{fieldErrors.password[0]}</p>
        ) : null}
      </div>

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Entrando…" : "Entrar"}
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
