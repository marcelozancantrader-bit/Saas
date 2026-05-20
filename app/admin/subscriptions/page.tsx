import { CreditCard } from "lucide-react";
import { AdminPlaceholder } from "@/components/features/admin-shell/AdminPlaceholder";

export const dynamic = "force-dynamic";

export default function SubscriptionsPage() {
  return (
    <AdminPlaceholder
      icon={CreditCard}
      title="Assinaturas"
      description="Pagamentos Asaas, histórico de cobranças e refunds"
      phase="Fase 5"
    />
  );
}
