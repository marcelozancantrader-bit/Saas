"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateOrganizationAction } from "@/server/actions/organizations/update.action";
import {
  uploadLogoAction,
  removeLogoAction,
} from "@/server/actions/organizations/upload-logo.action";
import { maskCpf, maskCnpj } from "@/lib/utils/brazilian-formatters";

export type WorkspaceInitial = {
  name: string;
  cnpj: string;
  registro_cau: string;
  registro_crea: string;
  logo_url: string;
  cor_primaria: string;
  bdi_padrao: number | null;
  pix_tipo: "" | "cpf" | "cnpj" | "email" | "telefone" | "aleatoria";
  pix_chave: string;
};

type Props = {
  initial: WorkspaceInitial;
  canEdit: boolean;
};

const PIX_LABEL: Record<WorkspaceInitial["pix_tipo"], string> = {
  "": "Sem PIX",
  cpf: "CPF",
  cnpj: "CNPJ",
  email: "E-mail",
  telefone: "Telefone",
  aleatoria: "Chave aleatória",
};

type TipoPessoa = "pf" | "pj";

function detectTipoPessoa(documento: string): TipoPessoa {
  // Default = PJ (mantém compatibilidade com orgs antigas que tinham só CNPJ).
  // Se já tem documento e ele tem 11 dígitos, assume PF.
  const digits = documento.replace(/\D+/g, "");
  return digits.length === 11 ? "pf" : "pj";
}

export function WorkspaceForm({ initial, canEdit }: Props) {
  const router = useRouter();
  // Aplica máscara inicial — initial.cnpj vem como dígitos puros do DB.
  const initialTipo = detectTipoPessoa(initial.cnpj);
  const [form, setForm] = useState<WorkspaceInitial>({
    ...initial,
    cnpj: initialTipo === "pf" ? maskCpf(initial.cnpj) : maskCnpj(initial.cnpj),
  });
  const [tipoPessoa, setTipoPessoa] = useState<TipoPessoa>(initialTipo);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const docLabel = tipoPessoa === "pf" ? "CPF" : "CNPJ";
  const docPlaceholder = tipoPessoa === "pf" ? "000.000.000-00" : "00.000.000/0000-00";
  const docMaxLength = tipoPessoa === "pf" ? 14 : 18;

  function onCpfCnpjChange(raw: string) {
    const masked = tipoPessoa === "pf" ? maskCpf(raw) : maskCnpj(raw);
    field("cnpj", masked);
  }

  const docHelpText = useMemo(() => {
    const digits = form.cnpj.replace(/\D+/g, "");
    if (digits.length === 0) return "Usado para emissão de cobrança PIX/boleto.";
    if (tipoPessoa === "pf" && digits.length !== 11) {
      return `CPF tem 11 dígitos. Você digitou ${digits.length}.`;
    }
    if (tipoPessoa === "pj" && digits.length !== 14) {
      return `CNPJ tem 14 dígitos. Você digitou ${digits.length}.`;
    }
    return "✓ Formato OK. A validação algorítmica acontece ao salvar.";
  }, [form.cnpj, tipoPessoa]);

  function field<K extends keyof WorkspaceInitial>(key: K, value: WorkspaceInitial[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function onTipoPessoaChange(novoTipo: TipoPessoa) {
    setTipoPessoa(novoTipo);
    // Limpa o campo ao trocar — evita salvar um CPF como CNPJ ou vice-versa.
    field("cnpj", "");
  }

  async function onLogoFile(file: File) {
    setUploadingLogo(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const r = await uploadLogoAction(fd);
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      field("logo_url", r.logo_url);
      toast.success("Logo atualizado.");
      router.refresh();
    } finally {
      setUploadingLogo(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function clearLogo() {
    setUploadingLogo(true);
    try {
      const r = await removeLogoAction();
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      field("logo_url", "");
      toast.success("Logo removido.");
      router.refresh();
    } finally {
      setUploadingLogo(false);
    }
  }

  async function submit() {
    setSaving(true);
    try {
      const r = await updateOrganizationAction({
        name: form.name,
        cnpj: form.cnpj || "",
        registro_cau: form.registro_cau || "",
        registro_crea: form.registro_crea || "",
        logo_url: form.logo_url || "",
        cor_primaria: form.cor_primaria || "",
        bdi_padrao: form.bdi_padrao,
        pix_tipo: form.pix_tipo,
        pix_chave: form.pix_chave || "",
      });
      if (!r.ok) toast.error(r.error);
      else toast.success("Workspace atualizado.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <fieldset disabled={!canEdit || saving} className="space-y-4 disabled:opacity-70">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="name">Nome do escritório</Label>
          <Input
            id="name"
            value={form.name}
            onChange={(e) => field("name", e.target.value)}
            maxLength={120}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="tipo-pessoa">Tipo de pessoa</Label>
          <Select value={tipoPessoa} onValueChange={(v) => onTipoPessoaChange(v as TipoPessoa)}>
            <SelectTrigger id="tipo-pessoa">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pf">Pessoa Física (CPF)</SelectItem>
              <SelectItem value="pj">Pessoa Jurídica (CNPJ)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="cnpj">{docLabel}</Label>
          <Input
            id="cnpj"
            value={form.cnpj}
            onChange={(e) => onCpfCnpjChange(e.target.value)}
            placeholder={docPlaceholder}
            maxLength={docMaxLength}
            inputMode="numeric"
            autoComplete="off"
          />
          <p className="text-xs text-zinc-500">{docHelpText}</p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="bdi">BDI padrão (%)</Label>
          <Input
            id="bdi"
            type="number"
            step="0.01"
            min="0"
            max="200"
            value={form.bdi_padrao ?? ""}
            onChange={(e) =>
              field("bdi_padrao", e.target.value === "" ? null : Number(e.target.value))
            }
            placeholder="25"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="cau">Registro CAU</Label>
          <Input
            id="cau"
            value={form.registro_cau}
            onChange={(e) => field("registro_cau", e.target.value)}
            placeholder="A00000-0"
            maxLength={40}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="crea">Registro CREA</Label>
          <Input
            id="crea"
            value={form.registro_crea}
            onChange={(e) => field("registro_crea", e.target.value)}
            placeholder="000000000-0"
            maxLength={40}
          />
        </div>

        <div className="space-y-1.5 sm:col-span-2">
          <Label>Logo do escritório</Label>
          <div className="flex items-start gap-3">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900">
              {form.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={form.logo_url} alt="Logo" className="h-full w-full object-contain" />
              ) : (
                <span className="text-[10px] text-zinc-400">sem logo</span>
              )}
            </div>
            <div className="flex-1 space-y-2">
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={uploadingLogo}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {uploadingLogo ? "Enviando…" : form.logo_url ? "Trocar imagem" : "Enviar imagem"}
                </Button>
                {form.logo_url ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={uploadingLogo}
                    onClick={clearLogo}
                  >
                    Remover
                  </Button>
                ) : null}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void onLogoFile(f);
                }}
              />
              <p className="text-xs text-zinc-500">
                PNG, JPG, WebP ou SVG. Máx 2 MB. Aparece no portal do cliente e no rodapé dos PDFs.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="cor">Cor primária</Label>
          <div className="flex items-center gap-2">
            <label
              htmlFor="cor-picker"
              className="flex h-10 w-12 shrink-0 cursor-pointer items-center justify-center rounded-md border border-zinc-300 transition hover:border-zinc-400 dark:border-zinc-700 dark:hover:border-zinc-600"
              style={{ backgroundColor: form.cor_primaria || "#1d4ed8" }}
              aria-label="Abrir seletor de cor"
              title="Clique para escolher a cor"
            >
              <input
                id="cor-picker"
                type="color"
                value={form.cor_primaria || "#1d4ed8"}
                onChange={(e) => field("cor_primaria", e.target.value)}
                className="sr-only"
              />
            </label>
            <Input
              id="cor"
              value={form.cor_primaria}
              onChange={(e) => field("cor_primaria", e.target.value)}
              placeholder="#1d4ed8"
              maxLength={7}
              className="font-mono"
            />
          </div>
          <p className="text-xs text-zinc-500">
            Clique no quadrado para abrir o seletor visual. Aparece em PDFs, portal e botões.
          </p>
        </div>
      </div>

      <div className="space-y-3 border-t border-zinc-200 pt-4 dark:border-zinc-800">
        <p className="text-sm font-medium">Dados PIX (para boletos manuais e portal)</p>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="pix-tipo">Tipo de chave</Label>
            <Select
              value={form.pix_tipo}
              onValueChange={(v) => field("pix_tipo", v as WorkspaceInitial["pix_tipo"])}
            >
              <SelectTrigger id="pix-tipo">
                <SelectValue placeholder="Sem PIX" />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(PIX_LABEL) as Array<keyof typeof PIX_LABEL>).map((k) => (
                  <SelectItem key={k} value={k}>
                    {PIX_LABEL[k]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="pix-chave">Chave PIX</Label>
            <Input
              id="pix-chave"
              value={form.pix_chave}
              onChange={(e) => field("pix_chave", e.target.value)}
              placeholder={
                form.pix_tipo === "cpf"
                  ? "000.000.000-00"
                  : form.pix_tipo === "cnpj"
                    ? "00.000.000/0000-00"
                    : form.pix_tipo === "email"
                      ? "voce@escritorio.com"
                      : form.pix_tipo === "telefone"
                        ? "+5511999999999"
                        : "chave aleatória"
              }
              disabled={!form.pix_tipo}
              maxLength={200}
            />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 border-t border-zinc-200 pt-4 dark:border-zinc-800">
        <Button onClick={submit} disabled={saving} size="sm">
          {saving ? "Salvando…" : "Salvar alterações"}
        </Button>
        {!canEdit ? (
          <p className="text-xs text-zinc-500">Apenas owner ou admin podem editar.</p>
        ) : null}
      </div>
    </fieldset>
  );
}
