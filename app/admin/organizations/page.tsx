import { Building2 } from "lucide-react";
import { AdminPlaceholder } from "@/components/features/admin-shell/AdminPlaceholder";

export const dynamic = "force-dynamic";

export default function OrganizationsPage() {
  return (
    <AdminPlaceholder
      icon={Building2}
      title="Organizações"
      description="Listar, buscar e gerenciar todas as organizações da plataforma"
      phase="Fase 3"
    />
  );
}
