"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Copy, Check } from "lucide-react";

type Props = {
  token: string;
};

export function InviteLinkCopy({ token }: Props) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    const url = `${window.location.origin}/convite/${token}`;
    await navigator.clipboard.writeText(url).catch(() => {});
    setCopied(true);
    toast.success("Link copiado");
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={copy}
      title="Copiar link do convite"
      className="text-zinc-500 hover:text-blue-600 dark:hover:text-blue-400"
    >
      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
    </Button>
  );
}
