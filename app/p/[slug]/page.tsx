import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { loadPortfolioBySlug } from "@/server/services/portfolio-loader";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const TIPOLOGIA_LABEL: Record<string, string> = {
  residencial: "Residencial",
  comercial: "Comercial",
  reforma: "Reforma",
  outros: "Outros",
};

const PADRAO_LABEL: Record<string, string> = {
  popular: "Padrão popular",
  medio: "Padrão médio",
  alto: "Alto padrão",
  luxo: "Luxo",
};

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const result = await loadPortfolioBySlug(slug);
  if (!result.ok) {
    return {
      title: "Portfólio não encontrado",
      robots: { index: false, follow: false },
    };
  }
  const { org, projects } = result.data;
  const title = `${org.name} · Portfólio`;
  const description =
    projects.length > 0
      ? `${projects.length} ${projects.length === 1 ? "projeto entregue" : "projetos entregues"} por ${org.name}.${
          org.profissional_nome ? ` Responsável técnico: ${org.profissional_nome}.` : ""
        }`
      : `Portfólio de projetos arquitetônicos de ${org.name}.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      siteName: org.name,
    },
    robots: { index: true, follow: true },
  };
}

export default async function PortfolioPublicPage({ params }: Props) {
  const { slug } = await params;
  const result = await loadPortfolioBySlug(slug);
  if (!result.ok) notFound();

  const { org, projects } = result.data;
  const profCred = [org.registro_cau, org.registro_crea].filter(Boolean).join(" · ");

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <header className="border-b border-zinc-200 pb-10 dark:border-zinc-800">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:gap-8">
          {org.logo_url ? (
            <Image
              src={org.logo_url}
              alt={`Logo de ${org.name}`}
              width={80}
              height={80}
              priority
              className="h-20 w-20 rounded-lg border border-zinc-200 object-contain dark:border-zinc-800"
            />
          ) : (
            <div
              className="flex h-20 w-20 items-center justify-center rounded-lg font-semibold text-white"
              style={{ backgroundColor: org.cor_primaria ?? "#1E3A8A" }}
              aria-hidden
            >
              {org.name.slice(0, 2).toUpperCase()}
            </div>
          )}
          <div>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{org.name}</h1>
            {org.profissional_nome ? (
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                Responsável técnico: <strong>{org.profissional_nome}</strong>
                {profCred ? ` · ${profCred}` : ""}
              </p>
            ) : profCred ? (
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{profCred}</p>
            ) : null}
            <p className="mt-3 text-sm text-zinc-500">
              {projects.length === 0
                ? "Em breve, projetos entregues estarão visíveis aqui."
                : `${projects.length} ${projects.length === 1 ? "projeto entregue" : "projetos entregues"}.`}
            </p>
          </div>
        </div>
      </header>

      {projects.length === 0 ? (
        <div className="mt-10 rounded-lg border border-dashed border-zinc-300 p-10 text-center text-sm text-zinc-500 dark:border-zinc-700">
          Nenhum projeto publicado ainda.
        </div>
      ) : (
        <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            <li
              key={p.id}
              className="overflow-hidden rounded-lg border border-zinc-200 bg-white transition hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900"
            >
              <div className="relative aspect-video w-full bg-zinc-100 dark:bg-zinc-800">
                {p.diary_thumbnail_url ? (
                  <Image
                    src={p.diary_thumbnail_url}
                    alt={`Foto de obra do projeto ${p.nome}`}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 384px"
                    className="object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-zinc-400">
                    Sem fotos de obra publicadas
                  </div>
                )}
              </div>
              <div className="space-y-2 p-4">
                <h2 className="font-semibold tracking-tight">{p.nome}</h2>
                <div className="flex flex-wrap gap-1.5 text-xs">
                  <span className="rounded-full border border-zinc-200 px-2 py-0.5 text-zinc-600 dark:border-zinc-700 dark:text-zinc-400">
                    {TIPOLOGIA_LABEL[p.tipologia] ?? p.tipologia}
                  </span>
                  {p.area_prevista_m2 ? (
                    <span className="rounded-full border border-zinc-200 px-2 py-0.5 text-zinc-600 dark:border-zinc-700 dark:text-zinc-400">
                      {p.area_prevista_m2.toLocaleString("pt-BR")} m²
                    </span>
                  ) : null}
                  {p.padrao_construtivo ? (
                    <span className="rounded-full border border-zinc-200 px-2 py-0.5 text-zinc-600 dark:border-zinc-700 dark:text-zinc-400">
                      {PADRAO_LABEL[p.padrao_construtivo] ?? p.padrao_construtivo}
                    </span>
                  ) : null}
                </div>
                {p.endereco_completo ? (
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">{p.endereco_completo}</p>
                ) : null}
                <p className="text-xs text-zinc-400">
                  Entregue em{" "}
                  {new Date(p.created_at).toLocaleDateString("pt-BR", {
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}

      <footer className="mt-16 border-t border-zinc-200 pt-6 text-center text-xs text-zinc-500 dark:border-zinc-800">
        Portfólio criado com{" "}
        <Link href="/" className="text-blue-700 hover:underline dark:text-blue-400">
          Memorial.ai
        </Link>{" "}
        — copiloto documental pra arquitetos e engenheiros
      </footer>
    </div>
  );
}
