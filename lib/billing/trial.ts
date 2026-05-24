/**
 * Trial pré-pago de 7 dias.
 *
 * Modelo:
 *   - 1 trial por organização (lifetime). Registrado em
 *     organizations.trial_started_at. Anti-abuse: orgs free com
 *     trial_started_at IS NULL podem iniciar; demais não.
 *   - Trial = subscriptions.status='trialing' + provider='trial' +
 *     current_period_end = now + TRIAL_DAYS.
 *   - Enquanto trial ativo: organizations.plano = TRIAL_PLAN (libera
 *     limites do plano testado).
 *   - Cron diário expired-trials-cron downgrade pra free na virada.
 *
 * Source-of-truth do plano testado e duração. Trocar TRIAL_PLAN exige
 * pensar no histórico (orgs que iniciaram com pro continuam pro até
 * expirar; só novas trials usariam o novo plano).
 */

export const TRIAL_PLAN = "pro" as const;
export const TRIAL_DAYS = 7;

/** Estado canônico do trial pra uma org. */
export type TrialState =
  | { kind: "never_started" } // pode iniciar
  | { kind: "active"; endsAt: Date; daysRemaining: number } // trial rodando
  | { kind: "expired"; endedAt: Date } // já testou, não pode de novo
  | { kind: "converted"; endedAt: Date }; // testou e virou pagante

/** Calcula dias restantes (arredondamento pra cima, mínimo 0). */
export function trialDaysRemaining(endsAt: Date, now: Date = new Date()): number {
  const ms = endsAt.getTime() - now.getTime();
  if (ms <= 0) return 0;
  return Math.ceil(ms / (24 * 60 * 60 * 1000));
}

/**
 * Decide o estado do trial a partir de dados crus:
 *   - trialStartedAt: timestamp em organizations.trial_started_at (anti-abuse)
 *   - trialingSub:    subscription com status='trialing' provider='trial' (se houver)
 *   - currentPlano:   plano vigente da org agora
 */
export function resolveTrialState(args: {
  trialStartedAt: string | null;
  trialingSub: { current_period_end: string | null } | null;
  currentPlano: string;
}): TrialState {
  const { trialStartedAt, trialingSub, currentPlano } = args;
  if (!trialStartedAt) return { kind: "never_started" };

  // Já iniciou. Pode estar rodando, expirado ou convertido.
  if (trialingSub?.current_period_end) {
    const endsAt = new Date(trialingSub.current_period_end);
    const remaining = trialDaysRemaining(endsAt);
    if (remaining > 0) return { kind: "active", endsAt, daysRemaining: remaining };
    // current_period_end já passou mas cron ainda não rodou
    return { kind: "expired", endedAt: endsAt };
  }

  // Sem sub trialing — testou e cron já processou.
  // Se plano atual != free, é convertido (assinou). Senão, voltou pra free.
  const endedAt = new Date(trialStartedAt);
  endedAt.setUTCDate(endedAt.getUTCDate() + TRIAL_DAYS);
  if (currentPlano !== "free") return { kind: "converted", endedAt };
  return { kind: "expired", endedAt };
}

/** Pode iniciar trial? Apenas quem nunca testou e está em free. */
export function canStartTrial(state: TrialState, currentPlano: string): boolean {
  return state.kind === "never_started" && currentPlano === "free";
}
