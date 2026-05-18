import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { STATUS_LABEL, TIPOLOGIA_LABEL } from "@/lib/validators/projects.schema";

type Status = keyof typeof STATUS_LABEL;
type Tipologia = keyof typeof TIPOLOGIA_LABEL;

export type ProjectRow = {
  id: string;
  nome: string;
  tipologia: Tipologia;
  status: Status;
  area_prevista_m2: number | null;
  clients: { id: string; nome: string } | null;
};

const STATUS_BADGE: Record<Status, "default" | "secondary" | "destructive" | "outline"> = {
  rascunho: "outline",
  em_andamento: "default",
  aguardando_cliente: "secondary",
  concluido: "secondary",
  arquivado: "outline",
};

type Props = { rows: ProjectRow[]; hasFilters?: boolean };

export function ProjectsTable({ rows, hasFilters = false }: Props) {
  if (rows.length === 0) {
    if (hasFilters) {
      return (
        <div className="rounded-md border border-dashed p-8 text-center">
          <p className="text-base font-medium">Nenhum projeto encontrado</p>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Ajuste a busca ou os filtros acima.
          </p>
        </div>
      );
    }
    return (
      <div className="rounded-md border border-dashed p-8 text-center">
        <p className="text-base font-medium">Nenhum projeto ainda</p>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Crie o primeiro projeto. Cada projeto pode ter planta, documentos por IA, portal do
          cliente e orçamento.
        </p>
        <div className="mt-4">
          <Button render={<Link href="/projetos/novo">+ Criar primeiro projeto</Link>} />
        </div>
        <p className="mt-4 text-xs text-zinc-500">
          Dica: cadastre o cliente em{" "}
          <Link href="/clientes/novo" className="underline">
            /clientes
          </Link>{" "}
          antes — fica disponível pra associar ao projeto.
        </p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nome</TableHead>
          <TableHead>Cliente</TableHead>
          <TableHead>Tipologia</TableHead>
          <TableHead>Área (m²)</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Ações</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((p) => (
          <TableRow key={p.id}>
            <TableCell className="font-medium">
              <Link href={`/projetos/${p.id}`} className="hover:underline">
                {p.nome}
              </Link>
            </TableCell>
            <TableCell className="text-sm text-zinc-600 dark:text-zinc-400">
              {p.clients?.nome ?? "—"}
            </TableCell>
            <TableCell className="text-sm text-zinc-600 dark:text-zinc-400">
              {TIPOLOGIA_LABEL[p.tipologia]}
            </TableCell>
            <TableCell className="text-sm text-zinc-600 dark:text-zinc-400">
              {p.area_prevista_m2 ? `${p.area_prevista_m2.toFixed(0)} m²` : "—"}
            </TableCell>
            <TableCell>
              <Badge variant={STATUS_BADGE[p.status]}>{STATUS_LABEL[p.status]}</Badge>
            </TableCell>
            <TableCell className="text-right">
              <Button
                variant="ghost"
                size="sm"
                render={<Link href={`/projetos/${p.id}`}>Abrir</Link>}
              />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
