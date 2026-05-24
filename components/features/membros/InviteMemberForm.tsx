"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UserPlus } from "lucide-react";
import { inviteMemberAction } from "@/server/actions/invitations/invite-member.action";

type Role = "admin" | "member";

export function InviteMemberForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("member");
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = email.trim();
    if (!/^\S+@\S+\.\S+$/.test(trimmed)) {
      toast.error("E-mail inválido");
      return;
    }
    startTransition(async () => {
      const r = await inviteMemberAction({ email: trimmed, role });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success(
        r.email_sent
          ? `Convite enviado pra ${trimmed} por e-mail.`
          : `Convite criado. Envio por e-mail desativado — copie o link e envie manualmente.`,
      );
      setEmail("");
      setRole("member");
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-[1fr_180px_auto]">
        <div className="space-y-1.5">
          <Label htmlFor="invite-email">E-mail do novo membro</Label>
          <Input
            id="invite-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="colega@escritorio.com"
            required
            disabled={pending}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="invite-role">Função</Label>
          <Select value={role} onValueChange={(v) => v && setRole(v as Role)}>
            <SelectTrigger id="invite-role">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="member">Membro</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-end">
          <Button type="submit" disabled={pending} className="w-full sm:w-auto">
            <UserPlus className="mr-1.5 h-3.5 w-3.5" />
            {pending ? "Enviando…" : "Enviar convite"}
          </Button>
        </div>
      </div>
      <p className="text-xs text-zinc-500">
        <strong>Membro</strong> vê todos os projetos do escritório e pode editar.{" "}
        <strong>Admin</strong> tem o mesmo + gerencia membros, configurações do workspace e billing.
        Owner é único (foi quem criou o workspace).
      </p>
    </form>
  );
}
