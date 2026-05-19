"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { updateProfileAction } from "@/server/actions/auth/update-profile.action";
import { changePasswordAction } from "@/server/actions/auth/change-password.action";
import { PasswordStrength } from "@/components/features/auth/PasswordStrength";

type Props = {
  email: string;
  fullName: string;
  role: "owner" | "admin" | "member";
  orgName: string;
  /** Se o usuário entrou via OAuth (Google), provedor de auth diferente; troca senha desabilitada. */
  providers: string[];
};

const ROLE_LABEL: Record<Props["role"], string> = {
  owner: "Owner",
  admin: "Admin",
  member: "Membro",
};

export function AccountCard({ email, fullName, role, orgName, providers }: Props) {
  const router = useRouter();
  const [name, setName] = useState(fullName);
  const [savingName, savingNameTransition] = useTransition();
  const [pwdOpen, setPwdOpen] = useState(false);

  const initials = (fullName?.trim() || email).slice(0, 2).toUpperCase().replace(/\W/g, "X") || "U";
  const isOAuth = providers.some((p) => p !== "email");
  const nameDirty = name.trim() !== fullName.trim();

  function saveName() {
    if (!nameDirty) return;
    savingNameTransition(async () => {
      const r = await updateProfileAction({ full_name: name });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success("Nome atualizado.");
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Sua conta</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex items-center gap-3">
          <Avatar className="h-12 w-12">
            <AvatarFallback className="text-base font-medium">{initials}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{email}</p>
            <p className="text-xs text-zinc-500">
              {ROLE_LABEL[role]} em <strong>{orgName}</strong>
              {isOAuth ? " · login via Google" : ""}
            </p>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="full_name">Nome completo</Label>
          <div className="flex gap-2">
            <Input
              id="full_name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={savingName}
              maxLength={120}
              placeholder="Como você quer ser chamado"
            />
            <Button onClick={saveName} disabled={!nameDirty || savingName} size="sm">
              {savingName ? "Salvando…" : "Salvar"}
            </Button>
          </div>
          <p className="text-xs text-zinc-500">
            Aparece nos documentos gerados, ART/RRT e contratos.
          </p>
        </div>

        <Separator />

        <div className="space-y-2">
          <p className="text-sm font-medium">Senha</p>
          {isOAuth ? (
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Você entrou via Google — a senha é gerenciada pela sua conta Google. Pra usar
              e-mail/senha aqui, defina uma senha clicando no botão abaixo.
            </p>
          ) : (
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Troque sua senha periodicamente. Mínimo 8 caracteres.
            </p>
          )}
          <Button variant="outline" size="sm" onClick={() => setPwdOpen(true)}>
            {isOAuth ? "Definir senha" : "Trocar senha"}
          </Button>
        </div>

        <ChangePasswordDialog open={pwdOpen} onOpenChange={setPwdOpen} skipCurrent={isOAuth} />
      </CardContent>
    </Card>
  );
}

function ChangePasswordDialog({
  open,
  onOpenChange,
  skipCurrent,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  skipCurrent: boolean;
}) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pending, startTransition] = useTransition();
  const [showNext, setShowNext] = useState(false);

  function reset() {
    setCurrent("");
    setNext("");
    setConfirm("");
    setShowNext(false);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (next !== confirm) {
      toast.error("A confirmação não bate com a nova senha.");
      return;
    }
    startTransition(async () => {
      const r = await changePasswordAction({
        current_password: skipCurrent ? next : current, // OAuth user define senha sem ter atual
        new_password: next,
        confirm_password: confirm,
      });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success("Senha atualizada. Use ela no próximo login.");
      reset();
      onOpenChange(false);
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) reset();
        onOpenChange(v);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{skipCurrent ? "Definir senha" : "Trocar senha"}</DialogTitle>
          <DialogDescription>
            {skipCurrent
              ? "Depois disso você poderá entrar usando seu e-mail + esta senha (sem depender do Google)."
              : "A nova senha entra em vigor no próximo login."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-3">
          {!skipCurrent ? (
            <div className="space-y-1.5">
              <Label htmlFor="current_password">Senha atual</Label>
              <Input
                id="current_password"
                type="password"
                value={current}
                onChange={(e) => setCurrent(e.target.value)}
                required
                disabled={pending}
                autoComplete="current-password"
              />
            </div>
          ) : null}

          <div className="space-y-1.5">
            <Label htmlFor="new_password">Nova senha</Label>
            <div className="relative">
              <Input
                id="new_password"
                type={showNext ? "text" : "password"}
                value={next}
                onChange={(e) => setNext(e.target.value)}
                required
                minLength={8}
                disabled={pending}
                autoComplete="new-password"
                className="pr-20"
              />
              <button
                type="button"
                onClick={() => setShowNext((v) => !v)}
                className="absolute top-1/2 right-2 -translate-y-1/2 rounded px-2 py-0.5 text-xs font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
              >
                {showNext ? "Ocultar" : "Mostrar"}
              </button>
            </div>
            <PasswordStrength password={next} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="confirm_password">Confirmar nova senha</Label>
            <Input
              id="confirm_password"
              type={showNext ? "text" : "password"}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              disabled={pending}
              autoComplete="new-password"
            />
            {confirm.length > 0 && confirm !== next ? (
              <p className="text-xs text-red-600">As senhas não batem.</p>
            ) : null}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                reset();
                onOpenChange(false);
              }}
              disabled={pending}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={
                pending || next.length < 8 || next !== confirm || (!skipCurrent && !current)
              }
            >
              {pending ? "Salvando…" : skipCurrent ? "Definir senha" : "Trocar senha"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
