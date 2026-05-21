"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertCircle, CheckCircle2, Info, TriangleAlert, X } from "lucide-react";
import type { ActiveAnnouncement } from "@/server/services/announcements-load";

const STORAGE_KEY = "memorial.ai:dismissed-announcements";

const SEVERITY_STYLES: Record<ActiveAnnouncement["severity"], string> = {
  info: "border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-900/40 dark:bg-blue-950/30 dark:text-blue-200",
  success:
    "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-200",
  warning:
    "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200",
  error:
    "border-red-200 bg-red-50 text-red-900 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-200",
};

const SEVERITY_ICONS = {
  info: Info,
  success: CheckCircle2,
  warning: TriangleAlert,
  error: AlertCircle,
};

type Props = {
  announcements: ActiveAnnouncement[];
};

export function AnnouncementBanner({ announcements }: Props) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let initial = new Set<string>();
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) initial = new Set(JSON.parse(raw) as string[]);
    } catch {
      // ignore corrupted storage
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hydration: localStorage só existe no client
    setDismissed(initial);
    setHydrated(true);
  }, []);

  function dismiss(id: string) {
    const next = new Set(dismissed);
    next.add(id);
    setDismissed(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(next)));
    } catch {
      // ignore quota errors
    }
  }

  if (!hydrated) return null;
  const visible = announcements.filter((a) => !dismissed.has(a.id));
  if (visible.length === 0) return null;

  return (
    <div className="space-y-2 px-4 pt-3 md:px-8">
      {visible.map((a) => {
        const Icon = SEVERITY_ICONS[a.severity];
        return (
          <div
            key={a.id}
            className={`flex items-start gap-3 rounded-lg border px-3 py-2 text-sm ${SEVERITY_STYLES[a.severity]}`}
            role="status"
          >
            <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <div className="flex-1 space-y-0.5">
              <p className="font-medium">{a.title}</p>
              <p className="text-xs opacity-90">{a.body}</p>
              {a.link_url ? (
                <Link
                  href={a.link_url}
                  className="mt-1 inline-block text-xs font-medium underline underline-offset-2"
                >
                  Saber mais →
                </Link>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => dismiss(a.id)}
              className="shrink-0 rounded p-1 opacity-60 transition hover:opacity-100"
              aria-label={`Dispensar anúncio "${a.title}"`}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
