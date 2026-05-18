"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type DeleteFileResult = { ok: true } | { ok: false; error: string };

export async function deleteFileAction(fileId: string): Promise<DeleteFileResult> {
  const supabase = await createClient();

  // Fetch the row first so we know the storage path + project for revalidation.
  const { data: file, error: fetchError } = await supabase
    .from("project_files")
    .select("id, storage_path, project_id")
    .eq("id", fileId)
    .single();

  if (fetchError || !file) {
    return { ok: false, error: "Arquivo não encontrado." };
  }

  // Remove from storage (best-effort — RLS may block if user lacks role)
  const { error: storageError } = await supabase.storage
    .from("project-files")
    .remove([file.storage_path as string]);
  if (storageError) {
    return { ok: false, error: storageError.message };
  }

  // Then delete the row (RLS gates this too)
  const { error: deleteError } = await supabase.from("project_files").delete().eq("id", fileId);
  if (deleteError) {
    return { ok: false, error: deleteError.message };
  }

  revalidatePath(`/projetos/${file.project_id}`);
  return { ok: true };
}
