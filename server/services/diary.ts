import { createClient } from "@/lib/supabase/server";

export type DiaryEntry = {
  id: string;
  project_id: string;
  titulo: string;
  body: string | null;
  registrado_em: string;
  local_label: string | null;
  photo_paths: string[];
  tags: string[];
  portal_visible: boolean;
  created_by: string | null;
  created_at: string;
};

export type DiaryEntryWithUrls = DiaryEntry & {
  photo_urls: string[];
};

/** Carrega entradas do diário do projeto (ordenadas por registrado_em desc). */
export async function loadDiaryEntries(projectId: string): Promise<DiaryEntryWithUrls[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("project_diary_entries")
    .select(
      "id, project_id, titulo, body, registrado_em, local_label, photo_paths, tags, portal_visible, created_by, created_at",
    )
    .eq("project_id", projectId)
    .order("registrado_em", { ascending: false })
    .returns<DiaryEntry[]>();
  if (error || !data) return [];

  // Gera signed URLs em batch para todas as fotos.
  const allPaths = data.flatMap((e) => e.photo_paths);
  const urlByPath = new Map<string, string>();
  if (allPaths.length > 0) {
    const { data: signed } = await supabase.storage
      .from("project-files")
      .createSignedUrls(allPaths, 60 * 60); // 1h
    for (const s of signed ?? []) {
      if (s.signedUrl && s.path) urlByPath.set(s.path, s.signedUrl);
    }
  }

  return data.map((e) => ({
    ...e,
    photo_urls: e.photo_paths.map((p) => urlByPath.get(p) ?? ""),
  }));
}
