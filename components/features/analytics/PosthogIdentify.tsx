"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { identify, capture, isPosthogEnabled } from "@/lib/observability/posthog";

type Props = {
  userId: string;
  email: string;
  orgId: string;
  orgName: string;
  plano: string;
};

/**
 * Identifica o user no PostHog (vincula distinct_id ao user.id) e dispara
 * $pageview a cada navegação. Renderiza no AppShell, no client side.
 *
 * Sem NEXT_PUBLIC_POSTHOG_KEY: tudo é no-op silencioso.
 */
export function PosthogIdentify({ userId, email, orgId, orgName, plano }: Props) {
  const pathname = usePathname();
  const identifiedRef = useRef(false);

  // Identify uma vez ao montar
  useEffect(() => {
    if (!isPosthogEnabled() || identifiedRef.current) return;
    identifiedRef.current = true;
    identify(userId, {
      email,
      org_id: orgId,
      org_name: orgName,
      plano,
    });
  }, [userId, email, orgId, orgName, plano]);

  // Page view a cada mudança de rota (após identify)
  useEffect(() => {
    if (!isPosthogEnabled() || !identifiedRef.current) return;
    capture("$pageview", { path: pathname });
  }, [pathname]);

  return null;
}
