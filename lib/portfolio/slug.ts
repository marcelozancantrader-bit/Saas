/**
 * Helpers de slug do portfólio público. Sem side effects — usado tanto em
 * Server Actions quanto em client components (auto-suggest no form).
 */

export function suggestSlugFromName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 40);
}
