"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import { deleteFileAction } from "@/server/actions/files/delete-file.action";
import { toast } from "sonner";

export type ProjectFileRow = {
  id: string;
  nome_original: string;
  storage_path: string;
  mime_type: string | null;
  tamanho_bytes: number | null;
  tipo: "planta_pdf" | "dwg" | "imagem" | "doc_gerado" | "outro";
  created_at: string;
};

const TIPO_LABEL: Record<ProjectFileRow["tipo"], string> = {
  planta_pdf: "Planta PDF",
  dwg: "DWG",
  imagem: "Imagem",
  doc_gerado: "Doc gerado",
  outro: "Outro",
};

function formatBytes(b: number | null): string {
  if (!b) return "—";
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
}

type Props = { files: ProjectFileRow[] };

export function FilesList({ files }: Props) {
  const router = useRouter();
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  if (files.length === 0) {
    return (
      <p className="text-sm text-zinc-500">
        Nenhum arquivo ainda. Faça upload do PDF da planta acima.
      </p>
    );
  }

  async function download(file: ProjectFileRow) {
    setDownloadingId(file.id);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.storage
        .from("project-files")
        .createSignedUrl(file.storage_path, 60); // 60s
      if (error || !data) {
        toast.error(error?.message ?? "Não foi possível gerar link de download");
        return;
      }
      window.open(data.signedUrl, "_blank", "noopener,noreferrer");
    } finally {
      setDownloadingId(null);
    }
  }

  function handleDelete(file: ProjectFileRow) {
    if (!confirm(`Excluir "${file.nome_original}"? Esta ação é irreversível.`)) return;
    startTransition(async () => {
      const result = await deleteFileAction(file.id);
      if (result.ok) {
        toast.success("Arquivo excluído");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
      {files.map((f) => (
        <li key={f.id} className="flex items-center justify-between gap-3 py-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{f.nome_original}</p>
            <div className="mt-0.5 flex items-center gap-2 text-xs text-zinc-500">
              <Badge variant="outline">{TIPO_LABEL[f.tipo]}</Badge>
              <span>{formatBytes(f.tamanho_bytes)}</span>
              <span>· {new Date(f.created_at).toLocaleString("pt-BR")}</span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => void download(f)}
              disabled={downloadingId === f.id}
            >
              {downloadingId === f.id ? "Abrindo…" : "Abrir"}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => handleDelete(f)}>
              Excluir
            </Button>
          </div>
        </li>
      ))}
    </ul>
  );
}
