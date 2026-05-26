import { requirePlatformAdmin } from "@/lib/auth/platform-admin";
import { NewAutomationForm } from "@/components/features/admin/automations/NewAutomationForm";
import { TRIGGERS_BY_CATEGORY } from "@/lib/automations/catalog";
import { RECIPES_BY_CATEGORY } from "@/lib/automations/recipes";

export const dynamic = "force-dynamic";

export default async function NewAutomationPage() {
  await requirePlatformAdmin();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Nova automação</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Use uma receita pronta como ponto de partida (recomendado) ou comece do zero escolhendo o
          trigger.
        </p>
      </div>

      <NewAutomationForm
        triggersByCategory={TRIGGERS_BY_CATEGORY}
        recipesByCategory={RECIPES_BY_CATEGORY}
      />
    </div>
  );
}
