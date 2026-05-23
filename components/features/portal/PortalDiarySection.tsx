import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin } from "lucide-react";
import type { PortalDiaryEntry } from "@/server/services/portal-loader";

type Props = {
  entries: PortalDiaryEntry[];
};

export function PortalDiarySection({ entries }: Props) {
  if (entries.length === 0) return null;

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Diário da obra</h2>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Acompanhe o que aconteceu na obra com fotos e notas. Atualizações em ordem cronológica
          reversa (mais recente primeiro).
        </p>
      </div>

      <div className="space-y-3">
        {entries.map((e) => (
          <Card key={e.id} className="overflow-hidden">
            <CardContent className="space-y-3 p-4">
              <div>
                <h3 className="text-base font-semibold tracking-tight">{e.titulo}</h3>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-500">
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {new Date(e.registrado_em).toLocaleString("pt-BR", {
                      day: "2-digit",
                      month: "long",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  {e.local_label ? (
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {e.local_label}
                    </span>
                  ) : null}
                </div>
              </div>

              {e.body ? (
                <p className="text-sm whitespace-pre-wrap text-zinc-700 dark:text-zinc-300">
                  {e.body}
                </p>
              ) : null}

              {e.photo_urls.length > 0 ? (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {e.photo_urls.map((url, i) => (
                    <a
                      key={i}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block aspect-square overflow-hidden rounded-md border border-zinc-200 dark:border-zinc-800"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={url}
                        alt={`Foto ${i + 1} — ${e.titulo}`}
                        className="h-full w-full object-cover transition hover:scale-105"
                        loading="lazy"
                      />
                    </a>
                  ))}
                </div>
              ) : null}

              {e.tags.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {e.tags.map((t) => (
                    <Badge key={t} variant="outline" className="text-[10px]">
                      #{t}
                    </Badge>
                  ))}
                </div>
              ) : null}
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
