"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArtRrtExport } from "./ArtRrtExport";
import { ATIVIDADE_TIPO_LABEL, type ArtRrtData, type ArtRrtTipo } from "@/lib/art-rrt/fields";

type Props = {
  /** Tudo o que conseguimos pré-preencher do projeto + org. */
  initial: ArtRrtData;
  filename: string;
};

export function ArtRrtCard({ initial, filename }: Props) {
  const [data, setData] = useState<ArtRrtData>(initial);

  function set<K extends keyof ArtRrtData>(key: K, value: ArtRrtData[K]) {
    setData((d) => ({ ...d, [key]: value }));
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">ART / RRT — pré-preenchimento</CardTitle>
        <p className="text-xs text-zinc-600 dark:text-zinc-400">
          Gere um PDF com todos os campos pré-preenchidos para acelerar o registro no SISCREA (ART)
          ou SISCAU (RRT). Não substitui a emissão oficial.
        </p>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Tipo de registro</Label>
            <Select value={data.tipo} onValueChange={(v) => set("tipo", v as ArtRrtTipo)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="rrt">RRT (CAU — arquiteto)</SelectItem>
                <SelectItem value="art">ART (CREA — engenheiro)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Atividade técnica</Label>
            <Select
              value={data.atividade_tipo}
              onValueChange={(v) => set("atividade_tipo", v as ArtRrtData["atividade_tipo"])}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(
                  Object.keys(ATIVIDADE_TIPO_LABEL) as Array<keyof typeof ATIVIDADE_TIPO_LABEL>
                ).map((k) => (
                  <SelectItem key={k} value={k}>
                    {ATIVIDADE_TIPO_LABEL[k]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="atividade_descricao">Descrição da atividade</Label>
          <Textarea
            id="atividade_descricao"
            value={data.atividade_descricao}
            onChange={(e) => set("atividade_descricao", e.target.value)}
            rows={2}
            maxLength={600}
            placeholder="Ex: Projeto arquitetônico completo, executivo, aprovação prefeitura"
          />
        </div>

        <details className="rounded border border-zinc-200 dark:border-zinc-800">
          <summary className="cursor-pointer px-3 py-2 text-sm font-medium">
            Detalhes do profissional / contratante / datas
          </summary>
          <div className="space-y-3 p-3 pt-1">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field
                label="Nome do profissional"
                value={data.profissional_nome}
                onChange={(v) => set("profissional_nome", v)}
              />
              <Field
                label={`Registro ${data.tipo === "art" ? "CREA" : "CAU"}`}
                value={data.profissional_registro}
                onChange={(v) => set("profissional_registro", v)}
              />
              <Field
                label="CPF do profissional"
                value={data.profissional_cpf}
                onChange={(v) => set("profissional_cpf", v)}
              />
              <Field
                label="E-mail"
                value={data.profissional_email}
                onChange={(v) => set("profissional_email", v)}
              />
            </div>

            <Field
              label="Endereço do profissional"
              value={data.profissional_endereco}
              onChange={(v) => set("profissional_endereco", v)}
            />

            <div className="grid gap-3 sm:grid-cols-2">
              <Field
                label="Contratante (nome)"
                value={data.contratante_nome}
                onChange={(v) => set("contratante_nome", v)}
              />
              <Field
                label="CPF/CNPJ do contratante"
                value={data.contratante_cpf_cnpj}
                onChange={(v) => set("contratante_cpf_cnpj", v)}
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="data_inicio">Data início</Label>
                <Input
                  id="data_inicio"
                  type="date"
                  value={data.data_inicio}
                  onChange={(e) => set("data_inicio", e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="data_termino">Previsão término</Label>
                <Input
                  id="data_termino"
                  type="date"
                  value={data.data_previsao_termino ?? ""}
                  onChange={(e) => set("data_previsao_termino", e.target.value || null)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="valor">Valor do contrato (R$)</Label>
                <Input
                  id="valor"
                  type="number"
                  step="0.01"
                  min="0"
                  value={data.valor_contrato_brl ?? ""}
                  onChange={(e) =>
                    set("valor_contrato_brl", e.target.value === "" ? null : Number(e.target.value))
                  }
                />
              </div>
            </div>
          </div>
        </details>

        <ArtRrtExport data={data} filename={filename} />
      </CardContent>
    </Card>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
