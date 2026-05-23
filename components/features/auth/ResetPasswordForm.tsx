"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { resetPasswordAction } from "@/server/actions/auth/reset-password.action";
import { PasswordStrength } from "./PasswordStrength";

export function ResetPasswordForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setError(null);
    setFieldErrors({});
    startTransition(async () => {
      const result = await resetPasswordAction(formData);
      if (!result) return;
      if (!result.ok) {
        setError(result.error);
        if (result.fieldErrors) setFieldErrors(result.fieldErrors);
        return;
      }
      toast.success("Senha atualizada. Entrando no workspace…");
      router.push("/dashboard");
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <div className="space-y-2">
        <Label htmlFor="new_password">Nova senha</Label>
        <div className="relative">
          <Input
            id="new_password"
            name="new_password"
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
        {fieldErrors.new_password?.[0] && (
          <p className="text-sm text-red-600">{fieldErrors.new_password[0]}</p>
        )}
        {password.length > 0 && <PasswordStrength password={password} />}
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirm_password">Confirme a nova senha</Label>
        <Input
          id="confirm_password"
          name="confirm_password"
          type={showPassword ? "text" : "password"}
          autoComplete="new-password"
          required
          minLength={8}
          disabled={pending}
        />
        {fieldErrors.confirm_password?.[0] && (
          <p className="text-sm text-red-600">{fieldErrors.confirm_password[0]}</p>
        )}
      </div>

      {error && (
        <div className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-200">
          {error}
        </div>
      )}

      <Button type="submit" className="w-full" disabled={pending} size="lg">
        {pending ? "Salvando…" : "Definir nova senha"}
      </Button>
    </form>
  );
}
