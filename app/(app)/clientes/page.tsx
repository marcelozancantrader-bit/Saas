import Link from "next/link";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { ClientsTable, type ClientRow } from "@/components/features/clients/ClientsTable";
import { SearchBar } from "@/components/features/shell/SearchBar";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ q?: string }>;

export default async function ClientesPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const q = params.q?.trim() ?? "";

  const supabase = await createClient();
  let query = supabase
    .from("clients")
    .select("id, nome, cpf_cnpj, email, endereco_cidade, endereco_uf")
    .order("nome", { ascending: true });

  if (q) {
    // busca em nome OU cpf_cnpj OU email
    const digits = q.replace(/\D+/g, "");
    if (digits.length >= 3) {
      query = query.or(`nome.ilike.%${q}%,cpf_cnpj.ilike.%${digits}%,email.ilike.%${q}%`);
    } else {
      query = query.or(`nome.ilike.%${q}%,email.ilike.%${q}%`);
    }
  }

  const { data, error } = await query.returns<ClientRow[]>();

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Clientes</h1>
          <p className="mt-1 text-base text-zinc-600 dark:text-zinc-400">
            Cadastro de clientes do escritório.
            {data && data.length > 0
              ? ` ${data.length} encontrado${data.length === 1 ? "" : "s"}.`
              : null}
          </p>
        </div>
        <Button render={<Link href="/clientes/novo">Novo cliente</Link>} />
      </div>

      <SearchBar placeholder="Buscar por nome, CPF/CNPJ ou e-mail…" />

      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-900 dark:border-red-900 dark:bg-red-950 dark:text-red-100">
          Erro ao carregar clientes: {error.message}
        </div>
      ) : (
        <ClientsTable rows={data ?? []} hasFilters={!!q} />
      )}
    </div>
  );
}
