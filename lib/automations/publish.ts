import "server-only";
import { inngest } from "@/lib/inngest/client";
import { TRIGGER_CATALOG, type TriggerCatalogEntry } from "./catalog";
import type { TriggerType } from "./types";

/**
 * Helper canônico pra publicar eventos do app no engine de automações.
 *
 * Uso: chame em pontos de mutação (signup, payment received, doc generated).
 * Fire-and-forget — não bloqueia a action principal. Erros são logados
 * mas não propagados.
 *
 * Exemplo:
 *   import { publishAdminEvent } from "@/lib/automations/publish";
 *   await publishAdminEvent("signup.created", {
 *     org_id, org_name, user_id, email, full_name
 *   });
 */
export async function publishAdminEvent(
  event: TriggerType,
  payload: Record<string, unknown>,
): Promise<void> {
  // Verifica que o trigger existe no catálogo (defesa contra typos).
  const entry: TriggerCatalogEntry | undefined = TRIGGER_CATALOG[event];
  if (!entry) {
    console.warn(`[publishAdminEvent] trigger "${event}" não está no catálogo — ignorando.`);
    return;
  }

  try {
    await inngest.send({
      name: "admin/event.fired",
      data: {
        event,
        payload,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err) {
    // Não propaga — automation não deve quebrar fluxo principal.
    console.warn(
      `[publishAdminEvent] falha ao publicar "${event}": ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}
