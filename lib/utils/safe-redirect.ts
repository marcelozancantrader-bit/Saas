/**
 * Returns `to` if it is a same-origin relative path, otherwise `fallback`.
 * Prevents open-redirect attacks via the `?next=` query parameter.
 */
export function safeRedirect(to: string | undefined | null, fallback = "/"): string {
  if (!to) return fallback;
  if (!to.startsWith("/")) return fallback;
  if (to.startsWith("//")) return fallback;
  if (to.startsWith("/\\")) return fallback;
  return to;
}
