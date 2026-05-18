"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { registerUploadAction } from "@/server/actions/files/register-upload.action";
import { toast } from "sonner";

const MAX_BYTES = 50 * 1024 * 1024; // 50 MB
const ACCEPTED = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "application/acad",
  "application/dwg",
  "image/vnd.dwg",
  "application/octet-stream",
];

type Props = {
  projectId: string;
  orgId: string;
};

function detectTipo(mime: string, filename: string): "planta_pdf" | "dwg" | "imagem" | "outro" {
  if (mime === "application/pdf") return "planta_pdf";
  if (mime.startsWith("image/")) return "imagem";
  const ext = filename.split(".").pop()?.toLowerCase();
  if (ext === "dwg") return "dwg";
  return "outro";
}

export function FileUploader({ projectId, orgId }: Props) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [pending, startTransition] = useTransition();

  async function handleFile(file: File) {
    if (file.size > MAX_BYTES) {
      toast.error(
        `Arquivo grande demais (${Math.round(file.size / 1024 / 1024)} MB). Limite: 50 MB.`,
      );
      return;
    }
    if (file.type && !ACCEPTED.includes(file.type)) {
      toast.warning(`Tipo "${file.type}" não está na lista de aceitos — tentando mesmo assim.`);
    }

    setUploading(true);
    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop() ?? "bin";
      const uuid = crypto.randomUUID();
      const storagePath = `${orgId}/${projectId}/${uuid}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("project-files")
        .upload(storagePath, file, { contentType: file.type, upsert: false });
      if (uploadError) {
        toast.error(`Falha no upload: ${uploadError.message}`);
        return;
      }

      startTransition(async () => {
        const result = await registerUploadAction({
          project_id: projectId,
          storage_path: storagePath,
          nome_original: file.name,
          mime_type: file.type || "application/octet-stream",
          tamanho_bytes: file.size,
          tipo: detectTipo(file.type, file.name),
        });
        if (result.ok) {
          toast.success(`Arquivo "${file.name}" enviado`);
          router.refresh();
          if (inputRef.current) inputRef.current.value = "";
        } else {
          toast.error(result.error);
          // best-effort cleanup of orphan storage object
          await supabase.storage
            .from("project-files")
            .remove([storagePath])
            .catch(() => {});
        }
      });
    } finally {
      setUploading(false);
    }
  }

  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) void handleFile(file);
  }

  const busy = uploading || pending;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        <Input
          ref={inputRef}
          type="file"
          accept=".pdf,.png,.jpg,.jpeg,.webp,.dwg,application/pdf,image/*"
          onChange={onChange}
          disabled={busy}
          className="max-w-md cursor-pointer file:cursor-pointer"
        />
        {busy ? (
          <Button disabled variant="outline" size="sm">
            Enviando…
          </Button>
        ) : null}
      </div>
      <p className="text-xs text-zinc-500">PDF, PNG, JPG, WEBP ou DWG (até 50 MB).</p>
    </div>
  );
}
