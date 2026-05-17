import { PlaceholderCard } from "@/components/features/shell/PlaceholderCard";

export default function BillingPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Billing</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Plano atual, faturas, upgrade / downgrade.
        </p>
      </div>
      <PlaceholderCard
        title="Assinatura e pagamentos"
        description="Plano atual (Free / Pro / Studio / Agency), upgrade via PIX / boleto / cartão (Asaas), faturas em PDF, gestão de limites técnicos do plano (projetos ativos, documentos IA por mês, usuários, marca d'água)."
        sprint="Sprint 7 — F8"
      />
    </div>
  );
}
