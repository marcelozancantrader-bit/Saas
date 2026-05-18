"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrg } from "@/server/services/current-org";

const MAX_BYTES = 2 * 1024 * 1024;
const ALLOWED = new Set(["image/png", "image/jpeg", "image/webp", "image/svg+xml"]);

export type UploadLogoResult = { ok: true; logo_url: string } | { ok: false; error: string };

/**
 * Sprint 8.5 — upload do logo do escritório.
 *
 * FormData com campo `file` (image/png|jpeg|webp|svg+xml, ≤2MB). Sobe pra
 * `org-logos/<org_id>/logo-<ts>.<ext>` (timestamp evita cache stale do CDN).
 * Atualiza organizations.logo_url com a URL pública. Bucket é público (RLS
 * permite SELECT a anon) pra que o portal do cliente possa renderizar sem
 * sessão.
 */
export async function uploadLogoAction(form: FormData): Promise<UploadLogoResult> {
  const file = form.get("file");
  if (!(file instanceof File)) return { ok: false, error: "Arquivo não enviado." };
  if (file.size === 0) return { ok: false, error: "Arquivo vazio." };
  if (file.size > MAX_BYTES) {
    return {
      ok: false,
      error: `Arquivo grande demais (${Math.round(file.size / 1024)} KB). Limite: 2 MB.`,
    };
  }
  if (!ALLOWED.has(file.type)) {
    return {
      ok: false,
      error: `Tipo não aceito: ${file.type || "desconhecido"}. Use PNG, JPG, WebP ou SVG.`,
    };
  }

  const me = await getCurrentOrg();
  if (me.role !== "owner" && me.role !== "admin") {
    return { ok: false, error: "Só owner ou admin pode trocar o logo." };
  }

  const supabase = await createClient();

  // ext do nome do arquivo (fallback pelo mime se ausente)
  const dotExt = file.name.includes(".") ? file.name.split(".").pop()! : "";
  const ext =
    (dotExt || "").toLowerCase() ||
    (file.type === "image/png"
      ? "png"
      : file.type === "image/jpeg"
        ? "jpg"
        : file.type === "image/webp"
          ? "webp"
          : "svg");
  const ts = Date.now();
  const path = `${me.orgId}/logo-${ts}.${ext}`;

  const { error: uploadErr } = await supabase.storage.from("org-logos").upload(path, file, {
    contentType: file.type,
    upsert: true,
    cacheControl: "31536000",
  });
  if (uploadErr) return { ok: false, error: uploadErr.message };

  const { data: pub } = supabase.storage.from("org-logos").getPublicUrl(path);
  const logo_url = pub.publicUrl;

  const { error: dbErr } = await supabase
    .from("organizations")
    .update({ logo_url, updated_at: new Date().toISOString() })
    .eq("id", me.orgId);
  if (dbErr) return { ok: false, error: dbErr.message };

  // Best-effort: limpa logos antigos da org no bucket (mantém só o atual).
  try {
    const { data: existing } = await supabase.storage.from("org-logos").list(me.orgId);
    const stale = (existing ?? []).map((f) => `${me.orgId}/${f.name}`).filter((p) => p !== path);
    if (stale.length > 0) {
      await supabase.storage.from("org-logos").remove(stale);
    }
  } catch {
    // não bloqueia o upload se a limpeza falhar
  }

  revalidatePath("/configuracoes");
  revalidatePath("/");
  return { ok: true, logo_url };
}

export type RemoveLogoResult = { ok: true } | { ok: false; error: string };

export async function removeLogoAction(): Promise<RemoveLogoResult> {
  const me = await getCurrentOrg();
  if (me.role !== "owner" && me.role !== "admin") {
    return { ok: false, error: "Só owner ou admin pode remover o logo." };
  }
  const supabase = await createClient();

  // Limpa todos os arquivos do org no bucket
  const { data: existing } = await supabase.storage.from("org-logos").list(me.orgId);
  const paths = (existing ?? []).map((f) => `${me.orgId}/${f.name}`);
  if (paths.length > 0) {
    await supabase.storage.from("org-logos").remove(paths);
  }

  await supabase
    .from("organizations")
    .update({ logo_url: null, updated_at: new Date().toISOString() })
    .eq("id", me.orgId);

  revalidatePath("/configuracoes");
  revalidatePath("/");
  return { ok: true };
}
