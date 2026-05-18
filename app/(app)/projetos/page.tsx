import Link from "next/link";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { ProjectsTable, type ProjectRow } from "@/components/features/projects/ProjectsTable";

export const dynamic = "force-dynamic";

export default async function ProjetosPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("projects")
    .select("id, nome, tipologia, status, area_prevista_m2, clients ( id, nome )")
    .order("created_at", { ascending: false })
    .returns<ProjectRow[]>();

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Projetos</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">Projetos do escritório.</p>
        </div>
        <Button render={<Link href="/projetos/novo">Novo projeto</Link>} />
      </div>

      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-900 dark:border-red-900 dark:bg-red-950 dark:text-red-100">
          Erro ao carregar projetos: {error.message}
        </div>
      ) : (
        <ProjectsTable rows={data ?? []} />
      )}
    </div>
  );
}
