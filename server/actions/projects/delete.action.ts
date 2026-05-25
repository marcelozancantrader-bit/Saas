"use server";

import { revalidatePath, updateTag } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type DeleteProjectResult = { ok: true } | { ok: false; error: string };

export async function deleteProjectAction(projectId: string): Promise<DeleteProjectResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("projects").delete().eq("id", projectId);

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath("/projetos");
  updateTag("plan-usage");
  updateTag("dashboard-metrics");
  return { ok: true };
}
