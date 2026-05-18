"use client";

import { useState, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { maskCep } from "@/lib/utils/brazilian-formatters";
import { lookupCepAction } from "@/server/actions/viacep.action";
import type { ViaCepAddress } from "@/lib/utils/viacep";
import { toast } from "sonner";

type Props = {
  id?: string;
  name?: string;
  defaultValue?: string;
  disabled?: boolean;
  onAddressFound?: (address: ViaCepAddress) => void;
};

/**
 * Masked CEP input that triggers ViaCEP lookup once 8 digits are typed.
 * Calls onAddressFound with the resolved address so the parent form can
 * autofill the other address fields.
 */
export function CepInput({ id, name, defaultValue, disabled, onAddressFound }: Props) {
  const [value, setValue] = useState(defaultValue ?? "");
  const [pending, startTransition] = useTransition();

  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const masked = maskCep(e.target.value);
    setValue(masked);
    const digits = masked.replace(/\D+/g, "");
    if (digits.length === 8 && onAddressFound) {
      startTransition(async () => {
        const result = await lookupCepAction(digits);
        if (result.ok) {
          onAddressFound(result.address);
        } else if (result.reason === "not_found") {
          toast.warning("CEP não encontrado");
        } else if (result.reason === "invalid") {
          toast.error("CEP inválido");
        } else {
          toast.error("Falha ao consultar ViaCEP");
        }
      });
    }
  }

  return (
    <Input
      id={id}
      name={name}
      type="text"
      inputMode="numeric"
      autoComplete="postal-code"
      placeholder="00000-000"
      maxLength={9}
      value={value}
      onChange={onChange}
      disabled={disabled || pending}
    />
  );
}
