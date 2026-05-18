"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type DeleteProjectResult = { ok: true } | { ok: false; error: string };

export async function deleteProjectAction(projectId: string): Promise<DeleteProjectResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("projects").delete().eq("id", projectId);

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath("/projetos");
  redirect("/projetos");
}
