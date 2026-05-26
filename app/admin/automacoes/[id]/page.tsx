import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePlatformAdmin } from "@/lib/auth/platform-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ArrowLeft, History } from "lucide-react";
import { AutomationEditor } from "@/components/features/admin/automations/AutomationEditor";
import { DeleteAutomationButton } from "@/components/features/admin/automations/DeleteAutomationButton";
import { AutomationToggle } from "@/components/features/admin/automations/AutomationToggle";
import {
  automationGraphSchema,
  triggerSchema,
  type AdminAutomation,
} from "@/lib/automations/types";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function AutomationEditorPage({ params }: Props) {
  const { id } = await params;
  await requirePlatformAdmin();
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("admin_automations")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error || !data) notFound();

  const triggerParsed = triggerSchema.safeParse(data.trigger);
  const graphParsed = automationGraphSchema.safeParse(data.graph);
  if (!triggerParsed.success || !graphParsed.success) notFound();

  const automation: AdminAutomation = {
    ...(data as AdminAutomation),
    trigger: triggerParsed.data,
    graph: graphParsed.data,
  };

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col">
      <div className="flex items-center justify-between gap-4 border-b border-zinc-200 px-4 py-2.5 dark:border-zinc-800">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/automacoes"
            className="text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
            aria-label="Voltar"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-base leading-tight font-semibold">{automation.name}</h1>
            {automation.description ? (
              <p className="text-xs text-zinc-500">{automation.description}</p>
            ) : null}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-zinc-600 dark:text-zinc-400">
            <span>{automation.enabled ? "Ativa" : "Pausada"}</span>
            <AutomationToggle id={automation.id} enabled={automation.enabled} />
          </div>
          <Link
            href={`/admin/automacoes/${automation.id}/runs`}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            <History className="mr-1.5 h-3.5 w-3.5" />
            Histórico ({automation.run_count})
          </Link>
          <DeleteAutomationButton id={automation.id} />
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <AutomationEditor automation={automation} />
      </div>
    </div>
  );
}
