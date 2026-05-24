import Link from "next/link";
import { BLOG_POSTS } from "@/lib/blog/posts";
import { Badge } from "@/components/ui/badge";

export const metadata = {
  title: "Blog técnico — Memorial.ai",
  description:
    "Artigos práticos sobre NBR, SINAPI, contratos CAU e gestão de escritório de arquitetura e engenharia no Brasil.",
};

const CATEGORY_TONE: Record<string, string> = {
  SINAPI:
    "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/40 dark:text-amber-200",
  NBR: "border-blue-300 bg-blue-50 text-blue-900 dark:border-blue-900/40 dark:bg-blue-950/40 dark:text-blue-200",
  Contratos:
    "border-violet-300 bg-violet-50 text-violet-900 dark:border-violet-900/40 dark:bg-violet-950/40 dark:text-violet-200",
  Gestão:
    "border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-900/40 dark:bg-emerald-950/40 dark:text-emerald-200",
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
}

export default function BlogIndexPage() {
  const posts = [...BLOG_POSTS].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:py-16">
      <div className="text-center">
        <p className="text-xs tracking-wider text-blue-700 uppercase dark:text-blue-400">
          Blog técnico
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
          Conteúdo prático para arquitetos e engenheiros BR
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-base text-zinc-600 dark:text-zinc-400">
          Artigos sobre NBR, SINAPI, contratos CAU e gestão de escritório. Sem encheção de linguiça
          — direto ao ponto que importa pra você fechar projeto.
        </p>
      </div>

      <div className="mt-12 space-y-4">
        {posts.map((post) => (
          <Link
            key={post.slug}
            href={`/blog/${post.slug}`}
            className="group block rounded-xl border border-zinc-200 bg-white p-5 transition-all hover:border-blue-300 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-blue-700"
          >
            <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500">
              <Badge className={CATEGORY_TONE[post.category] ?? ""} variant="outline">
                {post.category}
              </Badge>
              <span>·</span>
              <time dateTime={post.publishedAt}>{formatDate(post.publishedAt)}</time>
              <span>·</span>
              <span>{post.readingMinutes} min de leitura</span>
            </div>
            <h2 className="mt-2 text-xl font-semibold tracking-tight group-hover:text-blue-700 dark:group-hover:text-blue-400">
              {post.title}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
              {post.description}
            </p>
            <p className="mt-3 text-xs font-medium text-blue-600 group-hover:underline dark:text-blue-400">
              Ler artigo →
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
