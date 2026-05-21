import { requirePlatformAdmin } from "@/lib/auth/platform-admin";
import { loadAnnouncements } from "@/server/services/admin-flags";
import { AnnouncementsManager } from "@/components/features/admin-shell/AnnouncementsManager";
import { Megaphone } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AnnouncementsPage() {
  await requirePlatformAdmin();
  const announcements = await loadAnnouncements();

  return (
    <div className="space-y-6 text-zinc-100">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold text-white">
          <Megaphone className="h-6 w-6 text-amber-400" />
          Anúncios
        </h1>
        <p className="mt-1 text-sm text-zinc-400">
          Broadcast pro topo do app — anúncios podem ser segmentados por audiência.
        </p>
      </div>

      <div className="rounded-lg border border-zinc-800/60 bg-zinc-900/20 p-3 text-xs text-zinc-400">
        Anúncios ativos aparecem como banner no topo do app, filtrados por audiência. O usuário pode
        dispensar via X (preferência persistida em{" "}
        <code className="text-amber-300">localStorage</code>).
      </div>

      <AnnouncementsManager announcements={announcements} />
    </div>
  );
}
