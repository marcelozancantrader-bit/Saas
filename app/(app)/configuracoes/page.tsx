import { PlaceholderCard } from "@/components/features/shell/PlaceholderCard";

export default function ConfiguracoesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Configurações</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Dados do escritório, branding, BDI padrão e PIX.
        </p>
      </div>
      <PlaceholderCard
        title="Configurações do workspace"
        description="Nome do escritório, CNPJ, registro CAU/CREA, logo, cor primária, BDI padrão, dados PIX para boletos. Convite de membros (limites por plano)."
        sprint="Sprint 1 (esta sprint) → expandido no Sprint 7"
      />
    </div>
  );
}
