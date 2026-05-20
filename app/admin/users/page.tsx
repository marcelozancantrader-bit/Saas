import { Users } from "lucide-react";
import { AdminPlaceholder } from "@/components/features/admin-shell/AdminPlaceholder";

export const dynamic = "force-dynamic";

export default function UsersPage() {
  return (
    <AdminPlaceholder
      icon={Users}
      title="Usuários"
      description="Visão global de usuários, impersonation e reset de senha"
      phase="Fase 4"
    />
  );
}
