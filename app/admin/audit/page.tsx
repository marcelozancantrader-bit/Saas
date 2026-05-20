import { ScrollText } from "lucide-react";
import { AdminPlaceholder } from "@/components/features/admin-shell/AdminPlaceholder";

export const dynamic = "force-dynamic";

export default function AuditPage() {
  return (
    <AdminPlaceholder
      icon={ScrollText}
      title="Auditoria"
      description="Log global de ações sensíveis em toda a plataforma"
      phase="Fase 6"
    />
  );
}
