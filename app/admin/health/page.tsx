import { Activity } from "lucide-react";
import { AdminPlaceholder } from "@/components/features/admin-shell/AdminPlaceholder";

export const dynamic = "force-dynamic";

export default function HealthPage() {
  return (
    <AdminPlaceholder
      icon={Activity}
      title="Health"
      description="Status Inngest, Anthropic, Supabase e custos de IA"
      phase="Fase 8"
    />
  );
}
