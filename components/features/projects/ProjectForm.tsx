"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CepInput } from "@/components/features/address/CepInput";
import { ZoneamentoFields } from "@/components/features/zoneamento/ZoneamentoFields";
import { createProjectAction } from "@/server/actions/projects/create.action";
import { updateProjectAction } from "@/server/actions/projects/update.action";
import {
  PADRAO_LABEL,
  PADRAO_VALUES,
  STATUS_LABEL,
  STATUS_VALUES,
  TIPOLOGIA_LABEL,
  TIPOLOGIA_VALUES,
} from "@/lib/validators/projects.schema";
import type { ViaCepAddress } from "@/lib/utils/viacep";
import { toast } from "sonner";

type ProjectFormValues = {
  id?: string;
  nome?: string;
  client_id?: string | null;
  tipologia?: (typeof TIPOLOGIA_VALUES)[number];
  area_prevista_m2?: number | null;
  padrao_construtivo?: (typeof PADRAO_VALUES)[number] | null;
  endereco_cep?: string;
  endereco_completo?: string;
  status?: (typeof STATUS_VALUES)[number];
  cidade_codigo?: string | null;
  zoneamento?: string | null;
  area_terreno_m2?: number | null;
  /** Quando salvo, mostra label do zoneamento custom no ZoneamentoFields */
  zoneamento_custom_label?: string | null;
};

type ClientOption = { id: string; nome: string };

type Props = { initial?: ProjectFormValues; clients: ClientOption[] };

export function ProjectForm({ initial, clients }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [endereco, setEndereco] = useState(initial?.endereco_completo ?? "");

  function onAddressFound(addr: ViaCepAddress) {
    const full = [addr.logradouro, addr.bairro, addr.cidade, addr.uf].filter(Boolean).join(", ");
    setEndereco(full);
    toast.success("Endereço preenchido");
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFieldErrors({});
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const isUpdate = !!initial?.id;
      const result = isUpdate
        ? await updateProjectAction(initial!.id!, formData)
        : await createProjectAction(formData);
      if (!result) return;
      if ("ok" in result && result.ok) {
        if (!isUpdate && "id" in result) {
          toast.success("Projeto criado");
          router.push(`/projetos/${result.id}`);
        } else {
          toast.success("Projeto atualizado");
          router.refresh();
        }
        return;
      }
      if ("fieldErrors" in result) {
        setFieldErrors(result.fieldErrors);
        toast.error("Verifique os campos destacados");
      } else if ("error" in result) {
        toast.error(result.error);
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6" noValidate>
      <Section title="Dados do projeto">
        <Field
          label="Nome"
          required
          error={fieldErrors.nome?.[0]}
          input={
            <Input
              id="nome"
              name="nome"
              required
              maxLength={120}
              defaultValue={initial?.nome ?? ""}
              disabled={pending}
              placeholder="Ex: Casa Família Silva — Curitiba"
            />
          }
        />

        <Field
          label="Cliente"
          input={
            <Select name="client_id" defaultValue={initial?.client_id ?? ""}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="— Selecionar cliente —" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nome}
                    </SelectItem>
                  ))}
                  {clients.length === 0 ? (
                    <div className="px-3 py-2 text-xs text-zinc-500">
                      Nenhum cliente cadastrado. Crie um cliente primeiro.
                    </div>
                  ) : null}
                </SelectGroup>
              </SelectContent>
            </Select>
          }
        />

        <div className="grid gap-3 sm:grid-cols-2">
          <Field
            label="Tipologia"
            required
            error={fieldErrors.tipologia?.[0]}
            input={
              <Select name="tipologia" defaultValue={initial?.tipologia ?? "residencial"} required>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {TIPOLOGIA_VALUES.map((v) => (
                      <SelectItem key={v} value={v}>
                        {TIPOLOGIA_LABEL[v]}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            }
          />
          <Field
            label="Padrão construtivo"
            input={
              <Select name="padrao_construtivo" defaultValue={initial?.padrao_construtivo ?? ""}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="— Definir depois —" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {PADRAO_VALUES.map((v) => (
                      <SelectItem key={v} value={v}>
                        {PADRAO_LABEL[v]}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            }
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field
            label="Área prevista (m²)"
            error={fieldErrors.area_prevista_m2?.[0]}
            input={
              <Input
                id="area_prevista_m2"
                name="area_prevista_m2"
                type="number"
                step="0.01"
                min="0"
                defaultValue={initial?.area_prevista_m2 ?? ""}
                disabled={pending}
              />
            }
          />
          <Field
            label="Status"
            input={
              <Select name="status" defaultValue={initial?.status ?? "rascunho"}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {STATUS_VALUES.map((v) => (
                      <SelectItem key={v} value={v}>
                        {STATUS_LABEL[v]}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            }
          />
        </div>
      </Section>

      <Section title="Localização">
        <Field
          label="CEP do imóvel"
          error={fieldErrors.endereco_cep?.[0]}
          input={
            <CepInput
              id="endereco_cep"
              name="endereco_cep"
              defaultValue={initial?.endereco_cep}
              disabled={pending}
              onAddressFound={onAddressFound}
            />
          }
        />
        <Field
          label="Endereço completo"
          input={
            <Textarea
              id="endereco_completo"
              name="endereco_completo"
              rows={2}
              value={endereco}
              onChange={(e) => setEndereco(e.target.value)}
              disabled={pending}
              placeholder="Rua, número, bairro, cidade/UF"
            />
          }
        />
      </Section>

      <Section title="Plano diretor da cidade (opcional — habilita validação de zoneamento)">
        <ZoneamentoFields
          initialCidade={initial?.cidade_codigo ?? null}
          initialZona={initial?.zoneamento ?? null}
          initialAreaTerreno={initial?.area_terreno_m2 ?? null}
          disabled={pending}
          projectId={initial?.id}
          hasCustom={initial?.cidade_codigo === "custom"}
          customLabel={initial?.zoneamento_custom_label ?? null}
        />
      </Section>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => router.back()} disabled={pending}>
          Cancelar
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? "Salvando…" : initial?.id ? "Salvar alterações" : "Criar projeto"}
        </Button>
      </div>
    </form>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="space-y-3">
      <legend className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{title}</legend>
      <div className="space-y-3">{children}</div>
    </fieldset>
  );
}

function Field({
  label,
  required,
  error,
  input,
}: {
  label: string;
  required?: boolean;
  error?: string;
  input: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label>
        {label} {required ? <span className="text-red-600">*</span> : null}
      </Label>
      {input}
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
