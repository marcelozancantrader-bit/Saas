import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePlatformAdmin } from "@/lib/auth/platform-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ArrowLeft } from "lucide-react";
import { RunsTable } from "@/components/features/admin/automations/RunsTable";
import type { AdminAutomation, AdminAutomationRun } from "@/lib/automations/types";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function AutomationRunsPage({ params }: Props) {
  const { id } = await params;
  await requirePlatformAdmin();
  const admin = createAdminClient();

  const { data: auto } = await admin
    .from("admin_automations")
    .select("id, name, run_count, last_run_at")
    .eq("id", id)
    .maybeSingle<Pick<AdminAutomation, "id" | "name" | "run_count" | "last_run_at">>();
  if (!auto) notFound();

  const { data: runsRaw } = await admin
    .from("admin_automation_runs")
    .select("*")
    .eq("automation_id", id)
    .order("started_at", { ascending: false })
    .limit(100);
  const runs = (runsRaw ?? []) as AdminAutomationRun[];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href={`/admin/automacoes/${id}`}
            className="text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
            aria-label="Voltar ao editor"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">{auto.name}</h1>
            <p className="text-xs text-zinc-500">
              {auto.run_count} execuções no total
              {auto.last_run_at
                ? ` · última em ${new Date(auto.last_run_at).toLocaleString("pt-BR")}`
                : ""}
            </p>
          </div>
        </div>
        <Link
          href={`/admin/automacoes/${id}`}
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
        >
          Editor
        </Link>
      </div>

      <RunsTable runs={runs} />
    </div>
  );
}
