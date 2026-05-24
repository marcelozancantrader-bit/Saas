"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { cancelInvitationAction } from "@/server/actions/invitations/cancel-invitation.action";

type Props = {
  invitationId: string;
  email: string;
};

export function CancelInvitationButton({ invitationId, email }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function doCancel() {
    if (!confirm(`Cancelar convite enviado pra ${email}?`)) return;
    startTransition(async () => {
      const r = await cancelInvitationAction({ invitation_id: invitationId });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success("Convite cancelado");
      router.refresh();
    });
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={doCancel}
      disabled={pending}
      title="Cancelar convite"
      className="text-zinc-500 hover:text-red-600 dark:hover:text-red-400"
    >
      <X className="h-4 w-4" />
    </Button>
  );
}
