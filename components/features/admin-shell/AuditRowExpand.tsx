"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

type Props = {
  payload: Record<string, unknown> | null;
  userAgent: string | null;
};

export function AuditRowExpand({ payload, userAgent }: Props) {
  const [open, setOpen] = useState(false);
  const hasPayload = payload && Object.keys(payload).length > 0;
  const canExpand = hasPayload || userAgent;

  if (!canExpand) {
    return <span className="text-zinc-700">—</span>;
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1 text-[11px] text-zinc-400 hover:text-amber-300"
      >
        {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        {open ? "Ocultar" : "Detalhes"}
      </button>

      {open && (
        <div className="mt-1 space-y-1.5 rounded border border-zinc-800 bg-zinc-950 p-2">
          {hasPayload && (
            <div>
              <p className="text-[10px] tracking-wide text-zinc-500 uppercase">Payload</p>
              <pre className="mt-1 max-h-48 overflow-auto text-[10px] leading-relaxed text-zinc-300">
                {JSON.stringify(payload, null, 2)}
              </pre>
            </div>
          )}
          {userAgent && (
            <div>
              <p className="text-[10px] tracking-wide text-zinc-500 uppercase">User-Agent</p>
              <p className="mt-1 text-[10px] break-all text-zinc-400">{userAgent}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
