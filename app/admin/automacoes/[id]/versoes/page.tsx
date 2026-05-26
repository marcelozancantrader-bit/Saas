import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePlatformAdmin } from "@/lib/auth/platform-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ArrowLeft } from "lucide-react";
import { VersionList } from "@/components/features/admin/automations/VersionList";
import type { AutomationVersionRow } from "@/server/services/automation-versions";
import type { AdminAutomation } from "@/lib/automations/types";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function AutomationVersionsPage({ params }: Props) {
  const { id } = await params;
  await requirePlatformAdmin();
  const admin = createAdminClient();

  const { data: auto } = await admin
    .from("admin_automations")
    .select("id, name")
    .eq("id", id)
    .maybeSingle<Pick<AdminAutomation, "id" | "name">>();
  if (!auto) notFound();

  const { data: versionsRaw } = await admin
    .from("admin_automation_versions")
    .select("*")
    .eq("automation_id", id)
    .order("version_number", { ascending: false });
  const versions = (versionsRaw ?? []) as AutomationVersionRow[];

  // Resolve emails de created_by (best-effort)
  const userIds = [...new Set(versions.map((v) => v.created_by).filter((x): x is string => !!x))];
  const emailById = new Map<string, string>();
  if (userIds.length > 0) {
    for (const uid of userIds) {
      try {
        const { data } = await admin.auth.admin.getUserById(uid);
        if (data?.user?.email) emailById.set(uid, data.user.email);
      } catch {
        // ignora
      }
    }
  }

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
              Histórico de versões — snapshot automático a cada mudança material
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

      {versions.length === 0 ? (
        <div className="rounded-md border border-dashed border-zinc-300 p-8 text-center dark:border-zinc-700">
          <p className="text-sm text-zinc-500">
            Nenhuma versão registrada ainda. As versões são criadas automaticamente quando você
            altera o graph, o trigger ou nome/descrição da automação.
          </p>
        </div>
      ) : (
        <VersionList
          automationId={id}
          versions={versions.map((v) => ({
            ...v,
            created_by_email: v.created_by ? (emailById.get(v.created_by) ?? null) : null,
          }))}
        />
      )}
    </div>
  );
}
