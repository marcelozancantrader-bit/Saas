import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ClientForm } from "@/components/features/clients/ClientForm";

export default function NovoClientePage() {
  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/clientes"
          className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-50"
        >
          ← Clientes
        </Link>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Novo cliente</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dados do cliente</CardTitle>
        </CardHeader>
        <CardContent>
          <ClientForm />
        </CardContent>
      </Card>
    </div>
  );
}
