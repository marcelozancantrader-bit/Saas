/**
 * Helpers de grandfathering — orgs com `meta.grandfathered_until > now`
 * mantêm o preço cobrado antes do pricing v2 (migration P12, 2026-05-25).
 *
 * Implementação atual: o Asaas mantém o valor da subscription existente
 * naturalmente. Este módulo serve pra UI exibir o status correto pro usuário
 * ("preço congelado até DD/MM/YYYY") em vez de mostrar o novo preço da tabela.
 *
 * Pra evolução futura: armazenar `subscriptions.meta.legacy_price_cents` no
 * momento do grandfathering — assim exibimos o valor exato.
 */

export type OrgMetaForGrandfathering = {
  grandfathered_until?: string | null;
  legacy_price_cents?: number | null;
};

export type GrandfatheringStatus = {
  isGrandfathered: boolean;
  /** Data até quando o preço fica congelado (ISO 8601). */
  until: string | null;
  /** Quantos dias restam até o fim do grandfathering. */
  daysLeft: number | null;
};

/**
 * Retorna status de grandfathering pra uma org.
 *
 * @param orgMeta Objeto `organizations.meta` (jsonb) ou null.
 * @returns Status com flags pra UI decidir badge/aviso.
 */
export function getGrandfatheringStatus(
  orgMeta: OrgMetaForGrandfathering | null | undefined,
): GrandfatheringStatus {
  const until = orgMeta?.grandfathered_until ?? null;
  if (!until) return { isGrandfathered: false, until: null, daysLeft: null };

  const untilDate = new Date(until);
  if (Number.isNaN(untilDate.getTime())) {
    return { isGrandfathered: false, until: null, daysLeft: null };
  }

  const now = new Date();
  if (untilDate <= now) {
    return { isGrandfathered: false, until, daysLeft: 0 };
  }

  const msPerDay = 1000 * 60 * 60 * 24;
  const daysLeft = Math.ceil((untilDate.getTime() - now.getTime()) / msPerDay);
  return { isGrandfathered: true, until, daysLeft };
}

/**
 * Formato amigável da data BR pra exibir no UI.
 * "31/12/2027" pra `2027-12-31T00:00:00.000Z`.
 */
export function formatGrandfatheringDate(isoDate: string): string {
  try {
    return new Date(isoDate).toLocaleDateString("pt-BR");
  } catch {
    return isoDate;
  }
}
