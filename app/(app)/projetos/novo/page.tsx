import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { ProjectForm } from "@/components/features/projects/ProjectForm";

export const dynamic = "force-dynamic";

export default async function NovoProjetoPage() {
  const supabase = await createClient();
  const { data: clients } = await supabase
    .from("clients")
    .select("id, nome")
    .order("nome", { ascending: true })
    .returns<Array<{ id: string; nome: string }>>();

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/projetos"
          className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-50"
        >
          ← Projetos
        </Link>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Novo projeto</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dados do projeto</CardTitle>
        </CardHeader>
        <CardContent>
          <ProjectForm clients={clients ?? []} />
        </CardContent>
      </Card>
    </div>
  );
}
