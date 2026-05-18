import Link from "next/link";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { ClientsTable, type ClientRow } from "@/components/features/clients/ClientsTable";

export const dynamic = "force-dynamic";

export default async function ClientesPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clients")
    .select("id, nome, cpf_cnpj, email, endereco_cidade, endereco_uf")
    .order("nome", { ascending: true })
    .returns<ClientRow[]>();

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Clientes</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Cadastro de clientes do escritório.
          </p>
        </div>
        <Button render={<Link href="/clientes/novo">Novo cliente</Link>} />
      </div>

      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-900 dark:border-red-900 dark:bg-red-950 dark:text-red-100">
          Erro ao carregar clientes: {error.message}
        </div>
      ) : (
        <ClientsTable rows={data ?? []} />
      )}
    </div>
  );
}
