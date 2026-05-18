"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

/**
 * Client-side polling that refreshes the page every 5s while at least one
 * file is still being processed (status pendente or processando). Stops as
 * soon as nothing is in-flight. Renders nothing.
 */
export function ExtractionPoller({ anyInFlight }: { anyInFlight: boolean }) {
  const router = useRouter();
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!anyInFlight) return;
    timerRef.current = setInterval(() => {
      router.refresh();
    }, 5000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [anyInFlight, router]);

  return null;
}
