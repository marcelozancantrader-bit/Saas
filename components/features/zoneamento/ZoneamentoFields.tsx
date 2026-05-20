"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CIDADE_OPTIONS, CIDADES } from "@/lib/zoneamento/cidades";
import { ZoneamentoCustomDialog } from "./ZoneamentoCustomDialog";

type Props = {
  initialCidade?: string | null;
  initialZona?: string | null;
  initialAreaTerreno?: number | null;
  disabled?: boolean;
  /** Quando definido, mostra o botão "Outra cidade" que abre dialog vinculado ao projeto. */
  projectId?: string;
  /** Quando true, indica que o projeto já tem zoneamento_custom salvo. */
  hasCustom?: boolean;
  customLabel?: string | null;
};

export function ZoneamentoFields({
  initialCidade,
  initialZona,
  initialAreaTerreno,
  disabled,
  projectId,
  hasCustom,
  customLabel,
}: Props) {
  const [cidade, setCidade] = useState<string>(initialCidade ?? "");
  const [zona, setZona] = useState<string>(initialZona ?? "");

  const isCustom = cidade === "custom" || hasCustom;
  const cidadeData = cidade && cidade !== "custom" ? CIDADES[cidade] : null;
  const zonas = cidadeData?.zonas ?? [];

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="cidade_codigo">Cidade da obra</Label>
          <Select
            name="cidade_codigo"
            value={cidade}
            onValueChange={(v) => {
              setCidade(v ?? "");
              setZona(""); // resetar zona ao mudar cidade
            }}
            disabled={disabled}
          >
            <SelectTrigger id="cidade_codigo" className="w-full">
              <SelectValue placeholder="— Não definida —" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {CIDADE_OPTIONS.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="zoneamento">Zona do plano diretor</Label>
          <Select
            name="zoneamento"
            value={zona}
            onValueChange={(v) => setZona(v ?? "")}
            disabled={disabled || !cidade}
          >
            <SelectTrigger id="zoneamento" className="w-full">
              <SelectValue
                placeholder={cidade ? "— Selecionar zona —" : "Escolha a cidade primeiro"}
              />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {zonas.map((z) => (
                  <SelectItem key={z.zona} value={z.zona}>
                    {z.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="area_terreno_m2">Área do terreno (lote) em m²</Label>
        <Input
          id="area_terreno_m2"
          name="area_terreno_m2"
          type="number"
          step="0.01"
          min="0"
          defaultValue={initialAreaTerreno ?? ""}
          disabled={disabled}
          placeholder="Ex: 360"
        />
        <p className="text-xs text-zinc-500">
          Necessário para calcular taxa de ocupação e coeficiente de aproveitamento.
        </p>
      </div>

      {cidadeData ? (
        <p className="text-xs text-zinc-500">
          Regras carregadas: <strong>{cidadeData.lei}</strong>.
          {cidadeData.fonte_url ? (
            <>
              {" "}
              <a
                href={cidadeData.fonte_url}
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2"
              >
                Fonte
              </a>
              .
            </>
          ) : null}
        </p>
      ) : null}

      {isCustom && customLabel ? (
        <p className="text-xs text-zinc-500">
          Zoneamento personalizado salvo: <strong>{customLabel}</strong>.
        </p>
      ) : null}

      {/* Opção pra cidade fora da curadoria — dialog com IA + form manual */}
      {projectId ? (
        <div className="border-t border-dashed border-zinc-200 pt-3 dark:border-zinc-800">
          <p className="mb-2 text-xs text-zinc-600 dark:text-zinc-400">
            Cidade não está na lista? Cadastre os parâmetros do plano diretor (manual ou com auxílio
            de IA):
          </p>
          <ZoneamentoCustomDialog
            projectId={projectId}
            initialAreaTerreno={initialAreaTerreno}
            triggerLabel={
              hasCustom ? "Editar zoneamento personalizado" : "Outra cidade (manual ou IA)"
            }
          />
        </div>
      ) : null}
    </div>
  );
}
