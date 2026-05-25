import { test, expect } from "@playwright/test";

test.describe("Landing pública /", () => {
  test("renderiza headline e CTAs principais", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("heading", { name: /memorial técnico em/i })).toBeVisible();

    // CTA principal de signup deve estar visível e apontar pra /signup
    const signupCta = page.getByRole("link", { name: /criar conta grátis/i }).first();
    await expect(signupCta).toBeVisible();
    await expect(signupCta).toHaveAttribute("href", "/signup");

    // CTA secundário "Ver como funciona" ancorando pra #como-funciona
    const howCta = page.getByRole("link", { name: /como funciona/i }).first();
    await expect(howCta).toBeVisible();
  });

  test("seção de planos mostra os 5 tiers", async ({ page }) => {
    await page.goto("/#planos");

    // Cada plano tem label visível no título do card
    for (const label of ["Free", "Standard", "Pro", "Pro Max", "Agência"]) {
      await expect(page.getByText(label, { exact: true }).first()).toBeVisible();
    }
  });

  test("badge de 7 dias grátis aparece no card Pro", async ({ page }) => {
    await page.goto("/#planos");
    await expect(page.getByText(/7 dias grátis/i).first()).toBeVisible();
  });

  test("FAQ tem perguntas chave", async ({ page }) => {
    await page.goto("/#faq");

    await expect(page.getByText(/a ia substitui o profissional/i).first()).toBeVisible();
    await expect(page.getByText(/trial grátis pra testar/i).first()).toBeVisible();
  });

  test("link de login no header funciona", async ({ page }) => {
    await page.goto("/");
    const loginLink = page.getByRole("link", { name: /entrar/i }).first();
    await expect(loginLink).toBeVisible();
    await loginLink.click();
    await expect(page).toHaveURL(/\/login/);
  });

  test("footer linka pra páginas legais", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("link", { name: /privacidade/i }).first()).toHaveAttribute(
      "href",
      "/privacidade",
    );
    await expect(page.getByRole("link", { name: /termos/i }).first()).toHaveAttribute(
      "href",
      "/termos",
    );
  });
});
