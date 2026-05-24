import Link from "next/link";
import { notFound } from "next/navigation";
import { BLOG_POSTS, getPostBySlug } from "@/lib/blog/posts";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  return BLOG_POSTS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) return { title: "Post não encontrado — Memorial.ai" };
  return {
    title: `${post.title} — Memorial.ai`,
    description: post.description,
    openGraph: {
      title: post.title,
      description: post.description,
      type: "article",
      publishedTime: post.publishedAt,
    },
  };
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) notFound();

  const related = BLOG_POSTS.filter((p) => p.slug !== slug).slice(0, 2);

  return (
    <article className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:py-14">
      <div>
        <Link href="/blog" className="text-sm text-zinc-500 hover:underline">
          ← Todos os posts
        </Link>

        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
          <Badge variant="outline">{post.category}</Badge>
          <span>·</span>
          <time dateTime={post.publishedAt}>{formatDate(post.publishedAt)}</time>
          <span>·</span>
          <span>{post.readingMinutes} min de leitura</span>
        </div>

        <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">{post.title}</h1>
        <p className="mt-3 text-lg leading-relaxed text-zinc-600 dark:text-zinc-400">
          {post.description}
        </p>
      </div>

      <div className="mt-8 space-y-4 text-base leading-relaxed text-zinc-700 dark:text-zinc-300 [&_em]:italic [&_h2]:mt-8 [&_h2]:mb-3 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:tracking-tight [&_h2]:text-zinc-900 dark:[&_h2]:text-zinc-100 [&_ol]:list-decimal [&_ol]:space-y-1.5 [&_ol]:pl-6 [&_strong]:font-semibold [&_strong]:text-zinc-900 dark:[&_strong]:text-zinc-100 [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-6">
        {post.body}
      </div>

      <div className="mt-12 rounded-xl border border-blue-200 bg-gradient-to-br from-blue-50 to-white p-6 text-center dark:border-blue-900/50 dark:from-blue-950/30 dark:to-zinc-900">
        <h2 className="text-lg font-semibold">Coloque isso em prática no Memorial.ai</h2>
        <p className="mx-auto mt-2 max-w-xl text-sm text-zinc-600 dark:text-zinc-400">
          Copiloto de IA que gera memorial, orçamento SINAPI, contrato CAU e portal do cliente com
          assinatura digital. Grátis até 2 projetos.
        </p>
        <Link href="/signup" className={`${buttonVariants({ size: "lg" })} mt-4`}>
          Criar conta grátis →
        </Link>
      </div>

      {related.length > 0 ? (
        <div className="mt-12">
          <h2 className="text-base font-semibold tracking-tight">Leia também</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {related.map((r) => (
              <Link
                key={r.slug}
                href={`/blog/${r.slug}`}
                className="block rounded-lg border border-zinc-200 bg-white p-4 transition hover:border-blue-300 hover:shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-blue-700"
              >
                <Badge variant="outline" className="text-[10px]">
                  {r.category}
                </Badge>
                <p className="mt-2 text-sm font-semibold">{r.title}</p>
              </Link>
            ))}
          </div>
        </div>
      ) : null}
    </article>
  );
}
