import { PlaceholderCard } from "@/components/features/shell/PlaceholderCard";

export default function ClientesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Clientes</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">CRUD de clientes do escritório.</p>
      </div>
      <PlaceholderCard
        title="Gerenciar clientes"
        description="Cadastro completo: nome, CPF/CNPJ com validação algorítmica, e-mail, telefone, endereço com CEP auto-preenchido via ViaCEP. Cada cliente gera um token único de portal."
        sprint="Sprint 2 — F2"
      />
    </div>
  );
}
