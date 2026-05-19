import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { ProjectForm } from "@/components/features/projects/ProjectForm";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ client_id?: string }>;
};

export default async function NovoProjetoPage({ searchParams }: Props) {
  const supabase = await createClient();
  const sp = await searchParams;

  const { data: clients } = await supabase
    .from("clients")
    .select("id, nome")
    .order("nome", { ascending: true })
    .returns<Array<{ id: string; nome: string }>>();

  // Se veio ?client_id=, valida que o cliente existe na lista do org (sem RLS bypass).
  const preselectedClientId =
    sp.client_id && clients?.some((c) => c.id === sp.client_id) ? sp.client_id : null;

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/projetos"
          className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-50"
        >
          ← Projetos
        </Link>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Novo projeto</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dados do projeto</CardTitle>
        </CardHeader>
        <CardContent>
          <ProjectForm
            clients={clients ?? []}
            initial={preselectedClientId ? { client_id: preselectedClientId } : undefined}
          />
        </CardContent>
      </Card>
    </div>
  );
}
