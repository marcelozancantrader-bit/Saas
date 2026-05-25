import type { MetadataRoute } from "next";
import { BLOG_POSTS } from "@/lib/blog/posts";
import { createAdminClient } from "@/lib/supabase/admin";

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://memorial-ai-mu.vercel.app";

// Revalida sitemap a cada 6h — portfolios novos entram rápido sem stress.
export const revalidate = 21600;

/**
 * Sitemap dinâmico — apenas páginas públicas indexáveis.
 * Dashboard, projetos, clientes, portal etc não entram aqui.
 * Portfolios públicos das orgs entram via fetch direto.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const lastModified = new Date();
  const portfolioEntries = await loadPortfolioEntries();
  return [
    {
      url: SITE_URL,
      lastModified,
      changeFrequency: "weekly",
      priority: 1.0,
    },
    {
      url: `${SITE_URL}/login`,
      lastModified,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${SITE_URL}/signup`,
      lastModified,
      changeFrequency: "yearly",
      priority: 0.7,
    },
    {
      url: `${SITE_URL}/privacidade`,
      lastModified,
      changeFrequency: "yearly",
      priority: 0.2,
    },
    {
      url: `${SITE_URL}/termos`,
      lastModified,
      changeFrequency: "yearly",
      priority: 0.2,
    },
    {
      url: `${SITE_URL}/sobre`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${SITE_URL}/ferramentas`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/ferramentas/orcamento-sinapi-gratis`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.85,
    },
    {
      url: `${SITE_URL}/ferramentas/honorario-cau`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.85,
    },
    {
      url: `${SITE_URL}/ferramentas/cub-regional`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/blog`,
      lastModified,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    ...BLOG_POSTS.map((p) => ({
      url: `${SITE_URL}/blog/${p.slug}`,
      lastModified: new Date(p.publishedAt),
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
    ...portfolioEntries,
  ];
}

async function loadPortfolioEntries(): Promise<MetadataRoute.Sitemap> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("organizations")
      .select("portfolio_slug, updated_at")
      .eq("portfolio_enabled", true)
      .not("portfolio_slug", "is", null)
      .limit(5000);
    if (error || !data) return [];
    return data
      .filter((r) => r.portfolio_slug)
      .map((r) => ({
        url: `${SITE_URL}/p/${r.portfolio_slug}`,
        lastModified: r.updated_at ? new Date(r.updated_at as string) : new Date(),
        changeFrequency: "monthly" as const,
        priority: 0.6,
      }));
  } catch {
    return [];
  }
}
