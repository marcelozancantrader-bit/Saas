import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://memorial-ai-mu.vercel.app";

/**
 * robots.txt dinâmico.
 *
 * Permite crawl da landing pública e páginas legais.
 * Bloqueia áreas autenticadas, portal do cliente (token sensível) e APIs.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/login", "/signup", "/privacidade", "/termos"],
        disallow: [
          "/dashboard",
          "/projetos",
          "/clientes",
          "/configuracoes",
          "/billing",
          "/admin",
          "/portal",
          "/api",
          "/auth",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
