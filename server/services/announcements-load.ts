import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { PlanId } from "@/lib/plans/limits";

export type ActiveAnnouncement = {
  id: string;
  title: string;
  body: string;
  severity: "info" | "success" | "warning" | "error";
  link_url: string | null;
};

/**
 * Carrega anúncios ativos relevantes pro usuário atual.
 *
 * Audience format:
 *   - 'all'           → todos
 *   - 'paid'          → orgs com plano != 'free'
 *   - 'plan:<id>'     → orgs em um plano específico (free/standard/pro/pro_max/agency)
 *   - 'org:<uuid>'    → org específica
 *
 * Filtragem dupla: a policy RLS já filtra is_active/janela temporal; aqui
 * filtramos por audience client-side (RLS não tem como ler plano/org do user).
 */
export async function loadActiveAnnouncements(
  orgId: string,
  plano: PlanId,
): Promise<ActiveAnnouncement[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("announcements")
    .select("id, title, body, severity, audience, link_url")
    .eq("is_active", true)
    .order("starts_at", { ascending: false })
    .limit(20);

  if (!data) return [];

  return data
    .filter((a) => {
      const audience = a.audience as string;
      if (audience === "all") return true;
      if (audience === "paid") return plano !== "free";
      if (audience.startsWith("plan:")) return audience === `plan:${plano}`;
      if (audience.startsWith("org:")) return audience === `org:${orgId}`;
      return false;
    })
    .map((a) => ({
      id: a.id as string,
      title: a.title as string,
      body: a.body as string,
      severity: a.severity as ActiveAnnouncement["severity"],
      link_url: (a.link_url as string | null) ?? null,
    }));
}
