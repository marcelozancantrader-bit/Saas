import { test, expect } from "@playwright/test";

/**
 * Smoke das páginas estáticas/públicas. Garante que nenhum deploy futuro
 * derruba copy/SEO crítico das landings que o Google indexa.
 */

const PUBLIC_PAGES: Array<{
  path: string;
  heading: RegExp;
}> = [
  { path: "/sobre", heading: /memorial.ai|sobre/i },
  { path: "/privacidade", heading: /privacidade|política de privacidade/i },
  { path: "/termos", heading: /termos/i },
  { path: "/ferramentas", heading: /ferramentas/i },
  { path: "/ferramentas/orcamento-sinapi-gratis", heading: /orçamento|sinapi/i },
  { path: "/ferramentas/honorario-cau", heading: /honorário/i },
  { path: "/ferramentas/cub-regional", heading: /cub/i },
  { path: "/blog", heading: /blog|memorial/i },
  { path: "/login", heading: /entrar|login/i },
  { path: "/signup", heading: /criar conta|cadastr/i },
  { path: "/forgot-password", heading: /senha/i },
];

for (const p of PUBLIC_PAGES) {
  test(`GET ${p.path} renderiza`, async ({ page }) => {
    const res = await page.goto(p.path);
    expect(res?.status()).toBeLessThan(400);
    await expect(page.getByRole("heading").first()).toBeVisible();
    await expect(page.locator("body")).toContainText(p.heading);
  });
}

test("rota inexistente cai em 404 (notFound)", async ({ page }) => {
  const res = await page.goto("/rota-que-nao-existe-mesmo-blah");
  expect(res?.status()).toBe(404);
});

test("portal sem token retorna erro/404", async ({ page }) => {
  const res = await page.goto("/portal/token-invalido-1234");
  // Pode ser 404 ou página de erro graciosa; nunca 5xx ou 200 com dados.
  const status = res?.status() ?? 0;
  expect(status === 404 || status === 200).toBe(true);
  if (status === 200) {
    // Se renderizar, deve ser estado de erro — nunca conteúdo do projeto.
    await expect(page.locator("body")).not.toContainText(/dados do projeto/i);
  }
});
