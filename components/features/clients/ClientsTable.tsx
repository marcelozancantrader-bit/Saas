import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { maskCpfOrCnpj } from "@/lib/utils/brazilian-formatters";
import { RowActions } from "@/components/features/shell/RowActions";
import { deleteClientAction } from "@/server/actions/clients/delete.action";

export type ClientRow = {
  id: string;
  nome: string;
  cpf_cnpj: string | null;
  email: string | null;
  endereco_cidade: string | null;
  endereco_uf: string | null;
};

type Props = { rows: ClientRow[]; hasFilters?: boolean };

export function ClientsTable({ rows, hasFilters = false }: Props) {
  if (rows.length === 0) {
    if (hasFilters) {
      return (
        <div className="rounded-md border border-dashed p-8 text-center">
          <p className="text-base font-medium">Nenhum cliente encontrado</p>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">Ajuste a busca acima.</p>
        </div>
      );
    }
    return (
      <div className="rounded-md border border-dashed p-8 text-center">
        <p className="text-base font-medium">Nenhum cliente ainda</p>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Cadastre o contratante (pessoa física ou jurídica) — vira base para projetos, ART/RRT,
          contrato e portal do cliente.
        </p>
        <div className="mt-4">
          <Button render={<Link href="/clientes/novo">+ Criar primeiro cliente</Link>} />
        </div>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nome</TableHead>
          <TableHead>CPF/CNPJ</TableHead>
          <TableHead>E-mail</TableHead>
          <TableHead>Cidade</TableHead>
          <TableHead className="text-right">Ações</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((c) => (
          <TableRow key={c.id}>
            <TableCell className="font-medium">
              <Link href={`/clientes/${c.id}`} className="hover:underline">
                {c.nome}
              </Link>
            </TableCell>
            <TableCell className="text-sm text-zinc-600 dark:text-zinc-400">
              {c.cpf_cnpj ? maskCpfOrCnpj(c.cpf_cnpj) : "—"}
            </TableCell>
            <TableCell className="text-sm text-zinc-600 dark:text-zinc-400">
              {c.email ?? "—"}
            </TableCell>
            <TableCell className="text-sm text-zinc-600 dark:text-zinc-400">
              {c.endereco_cidade && c.endereco_uf ? `${c.endereco_cidade}/${c.endereco_uf}` : "—"}
            </TableCell>
            <TableCell className="text-right">
              <div className="flex items-center justify-end gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  render={<Link href={`/clientes/${c.id}`}>Abrir</Link>}
                />
                <ClientRowActions id={c.id} nome={c.nome} />
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function ClientRowActions({ id, nome }: { id: string; nome: string }) {
  const handleDelete = async () => {
    "use server";
    return await deleteClientAction(id);
  };
  return (
    <RowActions
      itemName={nome}
      entityLabel="cliente"
      deleteWarning="Projetos associados ficam sem cliente vinculado."
      successMessage="Cliente excluído"
      onDelete={handleDelete}
    />
  );
}
