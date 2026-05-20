import { TrendingUp } from "lucide-react";
import { AdminPlaceholder } from "@/components/features/admin-shell/AdminPlaceholder";

export const dynamic = "force-dynamic";

export default function RevenuePage() {
  return (
    <AdminPlaceholder
      icon={TrendingUp}
      title="Receita"
      description="MRR, ARR, ARPU, churn, LTV e gráficos de evolução"
      phase="Fase 2"
    />
  );
}
