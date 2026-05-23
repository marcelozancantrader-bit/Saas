"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrg } from "@/server/services/current-org";

const MAX_PHOTOS = 6;
const MAX_PHOTO_SIZE_BYTES = 8 * 1024 * 1024; // 8 MB
const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]);

const bodySchema = z.object({
  project_id: z.string().uuid(),
  titulo: z.string().trim().min(2).max(160),
  body: z.string().trim().max(4000).optional().or(z.literal("")),
  registrado_em: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2})?)?$/, "Data inválida")
    .optional()
    .or(z.literal("")),
  local_label: z.string().trim().max(160).optional().or(z.literal("")),
  tags: z.string().trim().max(400).optional().or(z.literal("")),
  portal_visible: z
    .union([z.literal("on"), z.literal("true"), z.literal("false"), z.literal("")])
    .optional(),
});

export type CreateDiaryEntryResult = { ok: true; entry_id: string } | { ok: false; error: string };

export async function createDiaryEntryAction(formData: FormData): Promise<CreateDiaryEntryResult> {
  const rawFields = {
    project_id: formData.get("project_id"),
    titulo: formData.get("titulo"),
    body: formData.get("body") ?? "",
    registrado_em: formData.get("registrado_em") ?? "",
    local_label: formData.get("local_label") ?? "",
    tags: formData.get("tags") ?? "",
    portal_visible: formData.get("portal_visible") ?? "",
  };
  const parsed = bodySchema.safeParse(rawFields);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Dados inválidos.",
    };
  }

  const me = await getCurrentOrg();
  const supabase = await createClient();

  // Confirma que o projeto é da org do usuário (defense in depth — RLS cobre também).
  const { data: project, error: projErr } = await supabase
    .from("projects")
    .select("id, org_id")
    .eq("id", parsed.data.project_id)
    .single<{ id: string; org_id: string }>();
  if (projErr || !project || project.org_id !== me.orgId) {
    return { ok: false, error: "Projeto não encontrado ou sem permissão." };
  }

  // Files: aceita até MAX_PHOTOS files na FormData com chave "photos".
  const filesRaw = formData
    .getAll("photos")
    .filter((v): v is File => v instanceof File && v.size > 0);
  if (filesRaw.length > MAX_PHOTOS) {
    return { ok: false, error: `Máximo de ${MAX_PHOTOS} fotos por entrada.` };
  }
  for (const f of filesRaw) {
    if (f.size > MAX_PHOTO_SIZE_BYTES) {
      return { ok: false, error: `Foto "${f.name}" excede 8 MB.` };
    }
    if (!ALLOWED_MIME.has(f.type)) {
      return { ok: false, error: `Formato não suportado: ${f.type || f.name}.` };
    }
  }

  // Gera o id da entry pra usar no path das fotos (assim podemos cleanup atômico).
  const entryId = randomUUID();
  const uploadedPaths: string[] = [];

  for (let i = 0; i < filesRaw.length; i++) {
    const file = filesRaw[i];
    if (!file) continue;
    const ext = guessExtension(file.type, file.name) ?? "jpg";
    const path = `${me.orgId}/${project.id}/diary/${entryId}-${i}.${ext}`;
    const { error: upErr } = await supabase.storage.from("project-files").upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type,
    });
    if (upErr) {
      // Cleanup parcial.
      if (uploadedPaths.length > 0) {
        await supabase.storage
          .from("project-files")
          .remove(uploadedPaths)
          .catch(() => {});
      }
      return { ok: false, error: `Falha ao subir "${file.name}": ${upErr.message}` };
    }
    uploadedPaths.push(path);
  }

  // Parse data e tags
  const registradoEm =
    parsed.data.registrado_em && parsed.data.registrado_em.length > 0
      ? new Date(parsed.data.registrado_em).toISOString()
      : new Date().toISOString();

  const tagsArr = (parsed.data.tags ?? "")
    .split(/[,;]/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0 && t.length <= 32)
    .slice(0, 8);

  const portalVisible =
    parsed.data.portal_visible === "on" || parsed.data.portal_visible === "true";

  const { error: insErr } = await supabase.from("project_diary_entries").insert({
    id: entryId,
    project_id: project.id,
    titulo: parsed.data.titulo,
    body: parsed.data.body || null,
    registrado_em: registradoEm,
    local_label: parsed.data.local_label || null,
    photo_paths: uploadedPaths,
    tags: tagsArr,
    portal_visible: portalVisible,
    created_by: me.userId,
  });

  if (insErr) {
    // Cleanup das fotos já uploadadas.
    if (uploadedPaths.length > 0) {
      await supabase.storage
        .from("project-files")
        .remove(uploadedPaths)
        .catch(() => {});
    }
    return { ok: false, error: `Falha ao salvar a entrada: ${insErr.message}` };
  }

  revalidatePath(`/projetos/${project.id}`);
  return { ok: true, entry_id: entryId };
}

function guessExtension(mime: string, filename: string): string | null {
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  if (mime === "image/heic" || mime === "image/heif") return "heic";
  const m = /\.(jpe?g|png|webp|heic|heif)$/i.exec(filename);
  return m?.[1]?.toLowerCase() ?? null;
}
