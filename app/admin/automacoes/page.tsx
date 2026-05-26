import Link from "next/link";
import { requirePlatformAdmin } from "@/lib/auth/platform-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Plus, Workflow } from "lucide-react";
import { TRIGGER_CATALOG } from "@/lib/automations/catalog";
import type { AdminAutomation, TriggerType } from "@/lib/automations/types";
import { AutomationToggle } from "@/components/features/admin/automations/AutomationToggle";
import { ImportAutomationButton } from "@/components/features/admin/automations/ImportAutomationButton";

export const dynamic = "force-dynamic";

export default async function AutomationsListPage() {
  await requirePlatformAdmin();
  const admin = createAdminClient();

  const { data: rows } = await admin
    .from("admin_automations")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);
  const automations = (rows ?? []) as AdminAutomation[];

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Automações admin</h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Desenhe regras tipo &ldquo;quando X acontecer no SaaS, faça Y&rdquo;. Triggers vêm de
            eventos internos (signup, pagamento, IA). Actions: email, Slack, Telegram, webhook,
            audit log.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ImportAutomationButton />
          <Link
            href="/admin/automacoes/nova"
            className={cn(buttonVariants({ variant: "default" }))}
          >
            <Plus className="mr-1.5 h-4 w-4" />
            Nova automação
          </Link>
        </div>
      </div>

      {automations.length === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-300 p-12 text-center dark:border-zinc-700">
          <Workflow className="mx-auto h-10 w-10 text-zinc-400" />
          <p className="mt-3 text-sm font-medium">Nenhuma automação ainda</p>
          <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
            Comece criando uma automação pra ser notificado de eventos do SaaS.
          </p>
          <Link
            href="/admin/automacoes/nova"
            className={cn(buttonVariants({ variant: "default" }), "mt-4")}
          >
            <Plus className="mr-1.5 h-4 w-4" />
            Criar primeira
          </Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 text-left text-xs text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400">
              <tr>
                <th className="px-4 py-2">Nome</th>
                <th className="px-4 py-2">Trigger</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Última exec</th>
                <th className="px-4 py-2 text-right">Total exec</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {automations.map((a) => {
                const triggerType = a.trigger.type as TriggerType;
                const triggerEntry = TRIGGER_CATALOG[triggerType];
                return (
                  <tr key={a.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/40">
                    <td className="px-4 py-2.5">
                      <Link
                        href={`/admin/automacoes/${a.id}`}
                        className="font-medium text-zinc-900 hover:underline dark:text-zinc-100"
                      >
                        {a.name}
                      </Link>
                      {a.description ? (
                        <p className="text-xs text-zinc-500">{a.description}</p>
                      ) : null}
                    </td>
                    <td className="px-4 py-2.5">
                      <Badge variant="outline" className="text-xs">
                        {triggerEntry?.label ?? a.trigger.type}
                      </Badge>
                    </td>
                    <td className="px-4 py-2.5">
                      <AutomationToggle id={a.id} enabled={a.enabled} />
                    </td>
                    <td className="px-4 py-2.5 text-xs text-zinc-600 dark:text-zinc-400">
                      {a.last_run_at ? new Date(a.last_run_at).toLocaleString("pt-BR") : "—"}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{a.run_count}</td>
                    <td className="px-4 py-2.5 text-right">
                      <Link
                        href={`/admin/automacoes/${a.id}/runs`}
                        className="text-xs text-blue-600 hover:underline dark:text-blue-400"
                      >
                        Histórico
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
