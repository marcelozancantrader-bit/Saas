import { requirePlatformAdmin } from "@/lib/auth/platform-admin";
import { loadFeatureFlags } from "@/server/services/admin-flags";
import { FeatureFlagsManager } from "@/components/features/admin-shell/FeatureFlagsManager";
import { Flag } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function FeatureFlagsPage() {
  await requirePlatformAdmin();
  const flags = await loadFeatureFlags();

  return (
    <div className="space-y-6 text-zinc-100">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold text-white">
          <Flag className="h-6 w-6 text-amber-400" />
          Feature flags
        </h1>
        <p className="mt-1 text-sm text-zinc-400">
          Override de funcionalidades por organização (org_id) ou globalmente.
        </p>
      </div>

      <div className="rounded-lg border border-zinc-800/60 bg-zinc-900/20 p-3 text-xs text-zinc-400">
        <strong className="text-zinc-200">Como ler:</strong> escopo &quot;global&quot; aplica a
        TODAS as orgs; escopo por org sobrescreve a global. Use{" "}
        <code className="text-amber-300">JSON</code> no value (true, false, 100,{" "}
        <code className="text-amber-300">&quot;texto&quot;</code>). Aplicar a flag no produto =
        consultar com{" "}
        <code className="text-amber-300">supabase.from(&quot;feature_flags&quot;).select(...)</code>
        .
      </div>

      <FeatureFlagsManager flags={flags} />
    </div>
  );
}
