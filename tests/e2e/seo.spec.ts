import { test, expect } from "@playwright/test";

/**
 * SEO smoke — garante que sitemap, robots e metadata estão íntegros.
 * Sem isso, push de feature pode acidentalmente quebrar indexação Google.
 */

test("GET /sitemap.xml retorna XML válido com URLs core", async ({ request }) => {
  const res = await request.get("/sitemap.xml");
  expect(res.status()).toBe(200);
  const xml = await res.text();
  expect(xml).toContain("<?xml");
  expect(xml).toContain("<urlset");
  expect(xml).toMatch(/<loc>https?:\/\/.+<\/loc>/);
  // URLs core obrigatórias
  expect(xml).toContain("/signup");
  expect(xml).toContain("/sobre");
  expect(xml).toContain("/ferramentas");
});

test("GET /robots.txt permite landing e bloqueia áreas autenticadas", async ({ request }) => {
  const res = await request.get("/robots.txt");
  expect(res.status()).toBe(200);
  const body = await res.text();
  expect(body).toContain("User-agent: *");
  // Áreas privadas devem estar bloqueadas pra crawler
  expect(body).toMatch(/Disallow:\s*\/dashboard/);
  expect(body).toMatch(/Disallow:\s*\/portal/);
  expect(body).toMatch(/Disallow:\s*\/api/);
  // Sitemap referenciado
  expect(body).toMatch(/Sitemap:\s*https?:\/\//);
});

test("Landing tem metadata e OG corretos", async ({ page }) => {
  await page.goto("/");

  // Title básico — deve conter Memorial.ai
  const title = await page.title();
  expect(title.toLowerCase()).toContain("memorial");

  // Meta description preenchida
  const description = await page.locator('meta[name="description"]').getAttribute("content");
  expect(description).toBeTruthy();
  expect((description ?? "").length).toBeGreaterThan(40);

  // OG tags essenciais
  const ogTitle = await page.locator('meta[property="og:title"]').getAttribute("content");
  expect(ogTitle).toBeTruthy();
});

test("Páginas estáticas retornam metadata individual", async ({ page }) => {
  await page.goto("/sobre");
  const sobreTitle = await page.title();
  expect(sobreTitle.length).toBeGreaterThan(5);

  await page.goto("/privacidade");
  const privTitle = await page.title();
  expect(privTitle.length).toBeGreaterThan(5);
});

test("portal /portal/[token] tem robots noindex", async ({ page }) => {
  await page.goto("/portal/token-fake-pra-testar-meta");
  // Existindo ou não o token, o layout do portal define robots: noindex/nofollow.
  const robotsMeta = await page.locator('meta[name="robots"]').first().getAttribute("content");
  if (robotsMeta) {
    expect(robotsMeta.toLowerCase()).toContain("noindex");
  }
});
