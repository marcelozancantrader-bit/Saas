"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { finalizeDocumentAction } from "@/server/actions/documents/finalize.action";
import { toast } from "sonner";

type Status = "rascunho" | "aguardando_aprovacao" | "aprovado" | "recusado" | "arquivado";
type WritableStatus = "rascunho" | "aguardando_aprovacao" | "aprovado" | "arquivado";

type Props = { documentId: string; status: Status };

export function DocumentStatusToggle({ documentId, status }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const nextStatus: WritableStatus = status === "rascunho" ? "aprovado" : "rascunho";
  const label = status === "rascunho" ? "Marcar como finalizado" : "Voltar para rascunho";

  function onToggle() {
    startTransition(async () => {
      const result = await finalizeDocumentAction({
        document_id: documentId,
        status: nextStatus,
      });
      if (result.ok) {
        toast.success(nextStatus === "aprovado" ? "Documento finalizado" : "Voltou a rascunho");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <Button variant="outline" size="sm" onClick={onToggle} disabled={pending}>
      {pending ? "…" : label}
    </Button>
  );
}
