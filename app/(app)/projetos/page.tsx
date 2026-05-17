import { PlaceholderCard } from "@/components/features/shell/PlaceholderCard";

export default function ProjetosPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Projetos</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">CRUD de projetos do escritório.</p>
      </div>
      <PlaceholderCard
        title="Gerenciar projetos"
        description="Listar, criar, editar e arquivar projetos. Vincular cliente, definir tipologia, área prevista, status. Cada projeto terá abas: Visão Geral, Arquivos, Orçamento, Documentos, Cliente."
        sprint="Sprint 2 — F2"
      />
    </div>
  );
}
