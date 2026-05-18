"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CepInput } from "@/components/features/address/CepInput";
import { createClientAction } from "@/server/actions/clients/create.action";
import { updateClientAction } from "@/server/actions/clients/update.action";
import { maskCpfOrCnpj, maskPhone } from "@/lib/utils/brazilian-formatters";
import type { ViaCepAddress } from "@/lib/utils/viacep";
import { toast } from "sonner";

type ClientFormValues = {
  id?: string;
  nome?: string;
  cpf_cnpj?: string;
  email?: string;
  telefone?: string;
  endereco_cep?: string;
  endereco_logradouro?: string;
  endereco_numero?: string;
  endereco_complemento?: string;
  endereco_bairro?: string;
  endereco_cidade?: string;
  endereco_uf?: string;
};

type Props = { initial?: ClientFormValues };

export function ClientForm({ initial }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  // Controlled address fields so CEP auto-fill works
  const [logradouro, setLogradouro] = useState(initial?.endereco_logradouro ?? "");
  const [bairro, setBairro] = useState(initial?.endereco_bairro ?? "");
  const [cidade, setCidade] = useState(initial?.endereco_cidade ?? "");
  const [uf, setUf] = useState(initial?.endereco_uf ?? "");
  const [complemento, setComplemento] = useState(initial?.endereco_complemento ?? "");

  // Lightly controlled fields for masking
  const [cpfCnpj, setCpfCnpj] = useState(initial?.cpf_cnpj ? maskCpfOrCnpj(initial.cpf_cnpj) : "");
  const [telefone, setTelefone] = useState(initial?.telefone ? maskPhone(initial.telefone) : "");

  function onAddressFound(addr: ViaCepAddress) {
    setLogradouro(addr.logradouro);
    setBairro(addr.bairro);
    setCidade(addr.cidade);
    setUf(addr.uf);
    if (addr.complemento) setComplemento(addr.complemento);
    toast.success("Endereço preenchido");
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFieldErrors({});
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const action = initial?.id
        ? () => updateClientAction(initial.id!, formData)
        : () => createClientAction(formData);
      const result = await action();
      if (!result) return; // redirect happened
      if ("ok" in result && result.ok) {
        toast.success("Cliente atualizado");
        router.refresh();
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
      <Section title="Identificação">
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
            />
          }
        />
        <Field
          label="CPF ou CNPJ"
          error={fieldErrors.cpf_cnpj?.[0]}
          input={
            <Input
              id="cpf_cnpj"
              name="cpf_cnpj"
              inputMode="numeric"
              maxLength={18}
              value={cpfCnpj}
              onChange={(e) => setCpfCnpj(maskCpfOrCnpj(e.target.value))}
              disabled={pending}
            />
          }
        />
      </Section>

      <Section title="Contato">
        <Field
          label="E-mail"
          error={fieldErrors.email?.[0]}
          input={
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              defaultValue={initial?.email ?? ""}
              disabled={pending}
            />
          }
        />
        <Field
          label="Telefone"
          error={fieldErrors.telefone?.[0]}
          input={
            <Input
              id="telefone"
              name="telefone"
              type="tel"
              inputMode="numeric"
              maxLength={15}
              value={telefone}
              onChange={(e) => setTelefone(maskPhone(e.target.value))}
              disabled={pending}
              placeholder="(41) 99999-9999"
            />
          }
        />
      </Section>

      <Section title="Endereço">
        <Field
          label="CEP"
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
          label="Logradouro"
          input={
            <Input
              id="endereco_logradouro"
              name="endereco_logradouro"
              value={logradouro}
              onChange={(e) => setLogradouro(e.target.value)}
              disabled={pending}
            />
          }
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <Field
            label="Número"
            input={
              <Input
                id="endereco_numero"
                name="endereco_numero"
                defaultValue={initial?.endereco_numero ?? ""}
                disabled={pending}
              />
            }
          />
          <Field
            label="Complemento"
            input={
              <Input
                id="endereco_complemento"
                name="endereco_complemento"
                value={complemento}
                onChange={(e) => setComplemento(e.target.value)}
                disabled={pending}
              />
            }
          />
        </div>
        <Field
          label="Bairro"
          input={
            <Input
              id="endereco_bairro"
              name="endereco_bairro"
              value={bairro}
              onChange={(e) => setBairro(e.target.value)}
              disabled={pending}
            />
          }
        />
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="sm:col-span-2">
            <Field
              label="Cidade"
              input={
                <Input
                  id="endereco_cidade"
                  name="endereco_cidade"
                  value={cidade}
                  onChange={(e) => setCidade(e.target.value)}
                  disabled={pending}
                />
              }
            />
          </div>
          <Field
            label="UF"
            error={fieldErrors.endereco_uf?.[0]}
            input={
              <Input
                id="endereco_uf"
                name="endereco_uf"
                value={uf}
                onChange={(e) => setUf(e.target.value.toUpperCase())}
                maxLength={2}
                disabled={pending}
              />
            }
          />
        </div>
      </Section>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => router.back()} disabled={pending}>
          Cancelar
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? "Salvando…" : initial?.id ? "Salvar alterações" : "Criar cliente"}
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
