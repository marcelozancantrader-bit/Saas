import { BookOpen } from "lucide-react";
import { NewDiaryEntryDialog } from "./NewDiaryEntryDialog";
import { DiaryEntryCard } from "./DiaryEntryCard";
import type { DiaryEntryWithUrls } from "@/server/services/diary";

type Props = {
  projectId: string;
  entries: DiaryEntryWithUrls[];
};

export function DiaryFeed({ projectId, entries }: Props) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Diário de obra</h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Registros cronológicos com fotos. Cada entrada vira prova legal de estado da obra e pode
            ser compartilhada com o cliente pelo portal.
          </p>
        </div>
        <NewDiaryEntryDialog projectId={projectId} />
      </div>

      {entries.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-zinc-300 bg-zinc-50/50 p-10 text-center dark:border-zinc-700 dark:bg-zinc-900/30">
          <BookOpen className="h-8 w-8 text-zinc-400" />
          <div>
            <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Diário ainda vazio
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              No canteiro, abra o app no celular e crie uma entrada com a câmera direta. Cada
              registro fica datado e georeferenciado pra ancorar pedidos de aditivo.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {entries.map((e) => (
            <DiaryEntryCard key={e.id} entry={e} />
          ))}
        </div>
      )}
    </div>
  );
}
