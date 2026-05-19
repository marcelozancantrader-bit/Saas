import Link from "next/link";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { ProjectsTable, type ProjectRow } from "@/components/features/projects/ProjectsTable";
import { SearchBar } from "@/components/features/shell/SearchBar";
import { FilterChips } from "@/components/features/shell/FilterChips";
import {
  STATUS_LABEL,
  STATUS_VALUES,
  TIPOLOGIA_LABEL,
  TIPOLOGIA_VALUES,
} from "@/lib/validators/projects.schema";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{
  q?: string;
  status?: string;
  tipologia?: string;
}>;

export default async function ProjetosPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const q = params.q?.trim() ?? "";
  const status = params.status;
  const tipologia = params.tipologia;

  const supabase = await createClient();
  let query = supabase
    .from("projects")
    .select("id, nome, tipologia, status, area_prevista_m2, clients ( id, nome )")
    .order("created_at", { ascending: false });

  if (q) query = query.ilike("nome", `%${q}%`);
  if (status && (STATUS_VALUES as readonly string[]).includes(status)) {
    query = query.eq("status", status);
  }
  if (tipologia && (TIPOLOGIA_VALUES as readonly string[]).includes(tipologia)) {
    query = query.eq("tipologia", tipologia);
  }

  const { data, error } = await query.returns<ProjectRow[]>();

  const statusOptions = STATUS_VALUES.map((v) => ({ value: v, label: STATUS_LABEL[v] }));
  const tipologiaOptions = TIPOLOGIA_VALUES.map((v) => ({ value: v, label: TIPOLOGIA_LABEL[v] }));

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Projetos</h1>
          <p className="mt-1 text-base text-zinc-600 dark:text-zinc-400">
            Projetos do escritório.
            {data && data.length > 0
              ? ` ${data.length} encontrado${data.length === 1 ? "" : "s"}.`
              : null}
          </p>
        </div>
        <Button render={<Link href="/projetos/novo">Novo projeto</Link>} />
      </div>

      <div className="space-y-3">
        <SearchBar placeholder="Buscar por nome do projeto…" />
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <div>
            <p className="mb-1 text-xs font-medium text-zinc-500">Status</p>
            <FilterChips paramName="status" options={statusOptions} />
          </div>
          <div>
            <p className="mb-1 text-xs font-medium text-zinc-500">Tipologia</p>
            <FilterChips paramName="tipologia" options={tipologiaOptions} />
          </div>
        </div>
      </div>

      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-900 dark:border-red-900 dark:bg-red-950 dark:text-red-100">
          Erro ao carregar projetos: {error.message}
        </div>
      ) : (
        <ProjectsTable rows={data ?? []} hasFilters={!!(q || status || tipologia)} />
      )}
    </div>
  );
}
