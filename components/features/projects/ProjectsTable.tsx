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
import { RowActions } from "@/components/features/shell/RowActions";
import { deleteProjectAction } from "@/server/actions/projects/delete.action";

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
    <>
      {/* Desktop: tabela completa */}
      <div className="hidden md:block">
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
                <TableCell className="text-base text-zinc-600 dark:text-zinc-400">
                  {p.clients?.nome ?? "—"}
                </TableCell>
                <TableCell className="text-base text-zinc-600 dark:text-zinc-400">
                  {TIPOLOGIA_LABEL[p.tipologia]}
                </TableCell>
                <TableCell className="text-base text-zinc-600 dark:text-zinc-400">
                  {p.area_prevista_m2 ? `${p.area_prevista_m2.toFixed(0)} m²` : "—"}
                </TableCell>
                <TableCell>
                  <Badge variant={STATUS_BADGE[p.status]}>{STATUS_LABEL[p.status]}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      render={<Link href={`/projetos/${p.id}`}>Abrir</Link>}
                    />
                    <ProjectRowActions id={p.id} nome={p.nome} />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile: cards stack */}
      <ul className="space-y-2 md:hidden">
        {rows.map((p) => (
          <li
            key={p.id}
            className="rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900"
          >
            <Link href={`/projetos/${p.id}`} className="block">
              <div className="flex items-start justify-between gap-2">
                <p className="font-medium text-zinc-900 dark:text-zinc-100">{p.nome}</p>
                <Badge variant={STATUS_BADGE[p.status]} className="shrink-0 text-[10px]">
                  {STATUS_LABEL[p.status]}
                </Badge>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-zinc-600 dark:text-zinc-400">
                {p.clients?.nome && <span>{p.clients.nome}</span>}
                <span>{TIPOLOGIA_LABEL[p.tipologia]}</span>
                {p.area_prevista_m2 && <span>{p.area_prevista_m2.toFixed(0)} m²</span>}
              </div>
            </Link>
            <div className="mt-2 flex items-center justify-end gap-1 border-t border-zinc-100 pt-2 dark:border-zinc-800">
              <Button
                variant="ghost"
                size="sm"
                render={<Link href={`/projetos/${p.id}`}>Abrir →</Link>}
              />
              <ProjectRowActions id={p.id} nome={p.nome} />
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}

function ProjectRowActions({ id, nome }: { id: string; nome: string }) {
  const handleDelete = async () => {
    "use server";
    return await deleteProjectAction(id);
  };
  return (
    <RowActions
      itemName={nome}
      entityLabel="projeto"
      deleteWarning="Arquivos no Storage e documentos gerados também serão removidos."
      successMessage="Projeto excluído"
      onDelete={handleDelete}
    />
  );
}
