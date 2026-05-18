"use client";

import { useState } from "react";
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

export function WorkspaceForm({ initial, canEdit }: Props) {
  const [form, setForm] = useState<WorkspaceInitial>(initial);
  const [saving, setSaving] = useState(false);

  function field<K extends keyof WorkspaceInitial>(key: K, value: WorkspaceInitial[K]) {
    setForm((f) => ({ ...f, [key]: value }));
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
          <Label htmlFor="cnpj">CNPJ</Label>
          <Input
            id="cnpj"
            value={form.cnpj}
            onChange={(e) => field("cnpj", e.target.value)}
            placeholder="00.000.000/0000-00"
            maxLength={20}
          />
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
          <Label htmlFor="logo">URL do logo</Label>
          <Input
            id="logo"
            value={form.logo_url}
            onChange={(e) => field("logo_url", e.target.value)}
            placeholder="https://…/logo.png"
            type="url"
            maxLength={500}
          />
          <p className="text-xs text-zinc-500">
            Cole a URL pública do seu logo (hospede no Drive público, Cloudinary, etc). Upload
            integrado vem depois.
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="cor">Cor primária</Label>
          <div className="flex items-center gap-2">
            <Input
              id="cor"
              value={form.cor_primaria}
              onChange={(e) => field("cor_primaria", e.target.value)}
              placeholder="#1a1a1a"
              maxLength={7}
            />
            <span
              aria-hidden
              className="h-8 w-10 shrink-0 rounded border border-zinc-300 dark:border-zinc-700"
              style={{ backgroundColor: form.cor_primaria || "#1a1a1a" }}
            />
          </div>
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
