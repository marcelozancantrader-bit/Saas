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

export type ClientRow = {
  id: string;
  nome: string;
  cpf_cnpj: string | null;
  email: string | null;
  endereco_cidade: string | null;
  endereco_uf: string | null;
};

type Props = { rows: ClientRow[] };

export function ClientsTable({ rows }: Props) {
  if (rows.length === 0) {
    return (
      <div className="rounded-md border border-dashed p-8 text-center text-sm text-zinc-500">
        Nenhum cliente cadastrado ainda.
        <div className="mt-3">
          <Button render={<Link href="/clientes/novo">Criar primeiro cliente</Link>} />
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
              <Button
                variant="ghost"
                size="sm"
                render={<Link href={`/clientes/${c.id}`}>Abrir</Link>}
              />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
