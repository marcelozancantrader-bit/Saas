import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { ClientForm } from "@/components/features/clients/ClientForm";
import { DeleteButton } from "@/components/features/shell/DeleteButton";
import { deleteClientAction } from "@/server/actions/clients/delete.action";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function ClienteDetailPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: client, error } = await supabase
    .from("clients")
    .select(
      "id, nome, cpf_cnpj, email, telefone, endereco_cep, endereco_logradouro, endereco_numero, endereco_complemento, endereco_bairro, endereco_cidade, endereco_uf",
    )
    .eq("id", id)
    .single();

  if (error || !client) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <Link
            href="/clientes"
            className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-50"
          >
            ← Clientes
          </Link>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">{client.nome}</h1>
        </div>
        <DeleteClientControl id={client.id} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Editar cliente</CardTitle>
        </CardHeader>
        <CardContent>
          <ClientForm initial={client} />
        </CardContent>
      </Card>
    </div>
  );
}

function DeleteClientControl({ id }: { id: string }) {
  const handle = async () => {
    "use server";
    return await deleteClientAction(id);
  };
  return (
    <DeleteButton
      label="Excluir cliente"
      confirmTitle="Excluir cliente?"
      confirmDescription="Os projetos vinculados manterão o histórico, mas o cliente será removido permanentemente."
      onConfirm={handle}
      redirectAfterSuccess="/clientes"
      successMessage="Cliente excluído"
      variant="outline"
      size="sm"
    />
  );
}
