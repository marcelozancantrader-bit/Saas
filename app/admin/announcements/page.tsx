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
        <strong className="text-zinc-200">UI ainda não exibe os anúncios no app principal</strong>—
        esta seção cria/gerencia. Próximo passo (futuro): banner no topo do AppShell consumindo a
        tabela <code className="text-amber-300">announcements</code> filtrada por audiência.
      </div>

      <AnnouncementsManager announcements={announcements} />
    </div>
  );
}
