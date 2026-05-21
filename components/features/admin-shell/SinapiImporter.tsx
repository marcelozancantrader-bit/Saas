"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { importSinapiAction } from "@/server/actions/admin/import-sinapi.action";
import { UploadCloud, FileCheck2, AlertTriangle } from "lucide-react";

type PreviewRow = {
  codigo: string;
  descricao: string;
  unidade: string;
  uf: string;
  mes_referencia: string;
  desonerado: boolean;
  preco: number;
};

type Preview = {
  ok: true;
  mode: "preview" | "applied";
  total: number;
  sample: PreviewRow[];
  summary: {
    ufs: string[];
    meses: string[];
    codes: number;
  };
};

export function SinapiImporter() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [rowErrors, setRowErrors] = useState<Array<{ row: number; message: string }>>([]);
  const [filename, setFilename] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function reset() {
    setPreview(null);
    setRowErrors([]);
    setFilename(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function handleFile(file: File) {
    setFilename(file.name);
    setRowErrors([]);
    setPreview(null);

    const formData = new FormData();
    formData.set("file", file);
    formData.set("mode", "preview");

    startTransition(async () => {
      const r = await importSinapiAction(formData);
      if (r.ok) {
        setPreview(r as Preview);
      } else {
        toast.error(r.error);
        if ("rowErrors" in r && r.rowErrors) setRowErrors(r.rowErrors);
      }
    });
  }

  async function applyImport() {
    const file = inputRef.current?.files?.[0];
    if (!file) {
      toast.error("Selecione o arquivo de novo.");
      return;
    }
    const formData = new FormData();
    formData.set("file", file);
    formData.set("mode", "apply");

    startTransition(async () => {
      const r = await importSinapiAction(formData);
      if (r.ok) {
        toast.success(`Importados ${r.total} preços.`);
        reset();
        router.refresh();
      } else {
        toast.error(r.error);
      }
    });
  }

  return (
    <div className="space-y-4 rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
      <div className="flex items-start gap-3">
        <UploadCloud className="mt-0.5 h-5 w-5 text-amber-400" aria-hidden />
        <div className="flex-1">
          <h2 className="text-base font-semibold text-zinc-100">Importar nova versão</h2>
          <p className="mt-1 text-xs text-zinc-400">
            Upload de XLSX ou CSV com colunas:{" "}
            <code className="text-amber-300">
              codigo, descricao, unidade, uf, mes_referencia, desonerado, preco
            </code>
            . Linhas com (codigo, uf, mes, desonerado) iguais às existentes são atualizadas.
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="sinapi-file" className="text-zinc-200">
          Arquivo
        </Label>
        <input
          ref={inputRef}
          id="sinapi-file"
          type="file"
          accept=".xlsx,.csv,.xls"
          disabled={pending}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void handleFile(f);
          }}
          className="block w-full text-sm text-zinc-300 file:mr-3 file:rounded-md file:border-0 file:bg-amber-500/90 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-zinc-900 hover:file:bg-amber-400"
        />
        {filename ? <p className="text-xs text-zinc-500">{filename}</p> : null}
      </div>

      {rowErrors.length > 0 ? (
        <div className="space-y-1 rounded-md border border-red-900/50 bg-red-950/30 p-3 text-xs text-red-200">
          <div className="flex items-center gap-1.5 font-medium">
            <AlertTriangle className="h-3.5 w-3.5" />
            Erros no arquivo:
          </div>
          <ul className="ml-4 list-disc space-y-0.5">
            {rowErrors.map((r) => (
              <li key={r.row}>
                Linha {r.row}: {r.message}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {preview ? (
        <div className="space-y-3 rounded-md border border-emerald-900/50 bg-emerald-950/30 p-3">
          <div className="flex items-start gap-2">
            <FileCheck2 className="mt-0.5 h-4 w-4 text-emerald-400" />
            <div className="space-y-0.5 text-xs text-emerald-100">
              <p className="font-medium">{preview.total} preços prontos pra importar</p>
              <p className="text-emerald-200/80">
                {preview.summary.codes} código(s) · {preview.summary.ufs.length} UF(s):{" "}
                {preview.summary.ufs.join(", ")} · {preview.summary.meses.length} mês/meses:{" "}
                {preview.summary.meses.map((m) => m.slice(0, 7)).join(", ")}
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-xs">
              <thead className="text-zinc-400">
                <tr>
                  <th className="px-2 py-1 text-left">Código</th>
                  <th className="px-2 py-1 text-left">UF</th>
                  <th className="px-2 py-1 text-left">Mês</th>
                  <th className="px-2 py-1 text-left">Deson.</th>
                  <th className="px-2 py-1 text-right">Preço</th>
                  <th className="px-2 py-1 text-left">Descrição</th>
                </tr>
              </thead>
              <tbody className="text-zinc-200">
                {preview.sample.map((r, i) => (
                  <tr key={i} className="border-t border-zinc-800/60">
                    <td className="px-2 py-1 font-mono">{r.codigo}</td>
                    <td className="px-2 py-1">{r.uf}</td>
                    <td className="px-2 py-1">{r.mes_referencia.slice(0, 7)}</td>
                    <td className="px-2 py-1">{r.desonerado ? "sim" : "não"}</td>
                    <td className="px-2 py-1 text-right">
                      R${" "}
                      {r.preco.toLocaleString("pt-BR", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </td>
                    <td className="px-2 py-1 text-zinc-400">{r.descricao.slice(0, 60)}</td>
                  </tr>
                ))}
                {preview.total > preview.sample.length ? (
                  <tr className="border-t border-zinc-800/60">
                    <td colSpan={6} className="px-2 py-1 text-center text-zinc-500">
                      … +{preview.total - preview.sample.length} linhas
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={reset} disabled={pending}>
              Cancelar
            </Button>
            <Button onClick={applyImport} disabled={pending} size="sm">
              {pending ? "Importando…" : `Importar ${preview.total} preços`}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
