import { Flag } from "lucide-react";
import { AdminPlaceholder } from "@/components/features/admin-shell/AdminPlaceholder";

export const dynamic = "force-dynamic";

export default function FeatureFlagsPage() {
  return (
    <AdminPlaceholder
      icon={Flag}
      title="Feature flags"
      description="Override de funcionalidades por organização"
      phase="Fase 7"
    />
  );
}
