import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright config — smoke E2E pré-beta.
 *
 * Foco: regressão de páginas públicas (landing, SEO, copy, ferramentas, blog,
 * portfolio). Fluxos autenticados ficam fora desta v1 — precisariam de
 * fixture Supabase com seed + teardown, escopo grande pra valor incremental.
 *
 * baseURL controlado por env:
 *   - `PLAYWRIGHT_BASE_URL=http://localhost:3000` (default, dev local)
 *   - `PLAYWRIGHT_BASE_URL=https://memorial-ai-mu.vercel.app` (prod)
 *
 * Rodar contra prod regularmente serve como heartbeat: detecta deploy quebrado
 * sem precisar de banco de teste.
 */
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [["github"], ["list"]] : "list",
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000",
    trace: "on-first-retry",
    actionTimeout: 10_000,
    navigationTimeout: 30_000,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  // Não iniciamos dev server automaticamente: a expectativa é que o usuário
  // suba `npm run dev` em outro terminal, ou aponte pra prod via env.
});
