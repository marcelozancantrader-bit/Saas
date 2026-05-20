import { Megaphone } from "lucide-react";
import { AdminPlaceholder } from "@/components/features/admin-shell/AdminPlaceholder";

export const dynamic = "force-dynamic";

export default function AnnouncementsPage() {
  return (
    <AdminPlaceholder
      icon={Megaphone}
      title="Anúncios"
      description="Broadcast para todos os clientes ou segmentos"
      phase="Fase 7"
    />
  );
}
